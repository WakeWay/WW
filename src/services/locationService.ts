/**
 * Location service for tracking user's current location
 * Handles both foreground and background location updates
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { LocationData, PermissionsState } from '@/types';
import { PermissionStatus } from '@/types';
import { useTripStore } from '@store/useTripStore';
import { isWithinRadius } from '../utils/distanceCalculator';
import { notificationService } from './notificationService';
import {
  LOCATION_TASK_NAME,
  LOCATION_UPDATE_INTERVAL_MS,
  LOCATION_TIMEOUT_MILLISECONDS,
  LOCATION_RETRY_ATTEMPTS,
  LOCATION_RETRY_DELAY_MS,
  ERROR_MESSAGES,
} from '@/constants';

/**
 * Define the background location task handler early during module initialization
 * This ensures the task is always available, even if the app is resumed in the background
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('[BG-LOCATION] Task error:', error);
    return;
  }

  if (!data || !data.locations || data.locations.length === 0) {
    return;
  }

  try {
    const location = data.locations[data.locations.length - 1];
    const store = useTripStore.getState();
    const activeTrip = store.activeTrip;

    if (!activeTrip || activeTrip.alarmTriggered || activeTrip.alarmDismissed) {
      return;
    }

    if (activeTrip.snoozeUntil && Date.now() < activeTrip.snoozeUntil) {
      return;
    }

    const currentLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitudeAccuracy: location.coords.altitudeAccuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };

    store.updateCurrentLocation(currentLocation);

    // Check if within alarm radius
    if (isWithinRadius(currentLocation, activeTrip.destination, activeTrip.radiusMeters)) {
      store.triggerAlarm();
      notificationService.triggerFullAlarm(activeTrip);
    }
  } catch (err) {
    console.error('[BG-LOCATION] Error processing background location:', err);
  }
});

class LocationService {
  private isLocationWatchingActive = false;
  private locationWatchId: Location.LocationSubscription | null = null;
  private lastLocationTimestamp = 0;

  /**
   * Request foreground location permission
   */
  async requestForegroundPermission(): Promise<PermissionStatus> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return this.mapPermissionStatus(status);
    } catch (error) {
      console.error('Failed to request foreground location permission:', error);
      return PermissionStatus.DENIED;
    }
  }

  /**
   * Request background location permission
   */
  async requestBackgroundPermission(): Promise<PermissionStatus> {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return this.mapPermissionStatus(status);
    } catch (error) {
      console.error('Failed to request background location permission:', error);
      return PermissionStatus.DENIED;
    }
  }

  /**
   * Get current location with retries for reliability
   */
  async getCurrentLocation(
    retries: number = LOCATION_RETRY_ATTEMPTS
  ): Promise<LocationData | null> {
    const store = useTripStore.getState();
    store.setIsLoadingLocation(true);

    try {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          store.setIsLoadingLocation(false);

          return this.mapLocationToLocationData(location);
        } catch (error) {
          if (attempt < retries - 1) {
            await this.delay(LOCATION_RETRY_DELAY_MS);
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Failed to get current location:', error);
      store.setError({
        code: 'LOCATION_ERROR',
        message: ERROR_MESSAGES.NO_LOCATION,
        context: { originalError: error },
        timestamp: Date.now(),
      });
      store.setIsLoadingLocation(false);
      return null;
    }

    return null;
  }

  /**
   * Start watching location updates (foreground)
   */
  async startLocationWatching(onLocationUpdate: (location: LocationData) => void): Promise<void> {
    try {
      // Check if already watching
      if (this.isLocationWatchingActive) {
        return;
      }

      this.locationWatchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000, // Real-time foreground updates (1s)
          distanceInterval: 1, // Real-time distance resolution (1m)
          mayShowUserSettingsDialog: true,
        },
        (location) => {
          const locationData = this.mapLocationToLocationData(location);
          onLocationUpdate(locationData);
          this.lastLocationTimestamp = Date.now();
        }
      );

      this.isLocationWatchingActive = true;
    } catch (error) {
      console.error('Failed to start location watching:', error);
      throw error;
    }
  }

  /**
   * Stop watching location updates
   */
  stopLocationWatching(): void {
    if (this.locationWatchId) {
      this.locationWatchId.remove();
      this.locationWatchId = null;
    }
    this.isLocationWatchingActive = false;
  }

  /**
   * Start background location task
   */
  async startBackgroundLocationTask(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      // Start location updates in background (task handler already defined at module init)
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_UPDATE_INTERVAL_MS,
        distanceInterval: 10,
        pausesUpdatesAutomatically: true, // Save battery when stationary
        foregroundService: {
          notificationTitle: 'WakeWay is tracking your location',
          notificationBody: 'Swipe to dismiss',
          notificationColor: '#007AFF',
        },
      });
    } catch (error) {
      console.error('Failed to start background location task:', error);
      throw error;
    }
  }

  /**
   * Stop background location task
   */
  async stopBackgroundLocationTask(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const isTaskDefined = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskDefined) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (error) {
      console.error('Failed to stop background location task:', error);
      throw error;
    }
  }

  /**
   * Check permissions
   */
  async checkPermissions(): Promise<PermissionsState> {
    try {
      const foreground = await Location.getForegroundPermissionsAsync();
      
      let backgroundStatus = 'granted';
      if (Platform.OS !== 'web') {
        const background = await Location.getBackgroundPermissionsAsync();
        backgroundStatus = background.status;
      }

      return {
        location: this.mapPermissionStatus(foreground.status),
        locationBackground: this.mapPermissionStatus(backgroundStatus),
        notifications: PermissionStatus.GRANTED, // Would check with notifications API
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return {
        location: PermissionStatus.DENIED,
        locationBackground: PermissionStatus.DENIED,
        notifications: PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Map Location API permission status to our enum
   */
  private mapPermissionStatus(status: string | Location.PermissionStatus): PermissionStatus {
    switch (status) {
      case 'granted':
      case Location.PermissionStatus.GRANTED:
        return PermissionStatus.GRANTED;
      case 'denied':
      case Location.PermissionStatus.DENIED:
        return PermissionStatus.DENIED;
      default:
        return PermissionStatus.UNDETERMINED;
    }
  }

  /**
   * Map Expo location to our LocationData type
   */
  private mapLocationToLocationData(location: Location.LocationObject): LocationData {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitudeAccuracy: location.coords.altitudeAccuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get location tracking status
   */
  isWatching(): boolean {
    return this.isLocationWatchingActive;
  }
}

export const locationService = new LocationService();
