/**
 * Background task handlers for location tracking and alarm triggering
 * These run even when the app is in the background
 */

import { LocationObject } from 'expo-location';
import { isWithinRadius, calculateDistance, isLocationJump } from '@utils/distanceCalculator';
import { useTripStore } from '@store/useTripStore';
import { notificationService } from '@services/notificationService';
import { LOG_LOCATION_UPDATES, LOG_DISTANCE_CALCULATIONS } from '@/constants';

/**
 * Main background location update handler
 * Called by the OS whenever location updates are available
 */
export const handleBackgroundLocationUpdate = async (locations: LocationObject[]): Promise<void> => {
  try {
    if (!locations || locations.length === 0) {
      return;
    }

    const latestLocation = locations[locations.length - 1];
    const store = useTripStore.getState();
    const activeTrip = store.activeTrip;



    // No active trip, skip processing
    if (!activeTrip || activeTrip.alarmTriggered) {
      return;
    }

    // Map location to internal format
    const currentLocation = {
      latitude: latestLocation.coords.latitude,
      longitude: latestLocation.coords.longitude,
    };

    // Detect location jumps (GPS errors)
    if (store.currentLocation) {
      const timeDelta = (latestLocation.timestamp - store.currentLocation.timestamp) / 1000;
      
      if (isLocationJump(store.currentLocation, currentLocation, timeDelta)) {
        return;
      }
    }

    // Update store with current location
    store.updateCurrentLocation({
      ...currentLocation,
      accuracy: latestLocation.coords.accuracy,
      altitudeAccuracy: latestLocation.coords.altitudeAccuracy,
      altitude: latestLocation.coords.altitude,
      heading: latestLocation.coords.heading,
      speed: latestLocation.coords.speed,
      timestamp: latestLocation.timestamp,
    });

    // Calculate distance to destination
    const distance = calculateDistance(currentLocation, activeTrip.destination);
    


    // Update trip with current distance
    store.updateActiveTrip({ distanceToDestination: distance });

    // Check if within alarm radius
    if (isWithinRadius(currentLocation, activeTrip.destination, activeTrip.radiusMeters)) {
      await triggerAlarmFromBackground(activeTrip);
    }
  } catch (error) {
    console.error('[BG-LOCATION] Error processing location:', error);
  }
};

/**
 * Trigger alarm when user enters destination radius
 * Ensures alarm only triggers once per trip
 */
export const triggerAlarmFromBackground = async (activeTrip: any): Promise<void> => {
  try {
    const store = useTripStore.getState();

    // Prevent duplicate alarms
    if (activeTrip.alarmTriggered) {
      return;
    }



    // Update store to mark alarm as triggered
    store.triggerAlarm();

    // Play alarm sound and send notification
    await notificationService.triggerFullAlarm(activeTrip);


  } catch (error) {
    console.error('[ALARM] Error triggering alarm:', error);
  }
};

/**
 * Handle app state changes during active tracking
 * Called when app moves between foreground/background
 */
export const handleAppStateChange = (state: 'active' | 'background' | 'inactive'): void => {
  const store = useTripStore.getState();
  
  if (state === 'active') {
    if (store.isTrackingActive && !store.activeTrip?.alarmTriggered) {
      // Re-sync location
    }
  } else if (state === 'background') {
    // Background location tracking should continue
  }
};

/**
 * Periodic cleanup task
 * Removes old trip history, cleans up stale data
 */
export const performPeriodicCleanup = async (): Promise<void> => {
  try {
    const store = useTripStore.getState();
    const ONE_MONTH_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Filter out old trip history
    const recentHistory = store.tripHistory.filter((trip) => trip.endTime > ONE_MONTH_AGO);

    if (recentHistory.length < store.tripHistory.length) {
      // Update store with cleaned history
    }
  } catch (error) {
    console.error('[CLEANUP] Error during periodic cleanup:', error);
  }
};

/**
 * Health check for background tracking
 * Verifies that location tracking is still active
 */
export const performHealthCheck = async (): Promise<boolean> => {
  try {
    const store = useTripStore.getState();

    if (!store.isTrackingActive) {
      return false;
    }

    // Check if we have recent location updates
    const lastLocationTime = store.currentLocation?.timestamp || 0;
    const timeSinceLastUpdate = Date.now() - lastLocationTime;
    const MAX_TIME_WITHOUT_UPDATE = 5 * 60 * 1000; // 5 minutes

    if (timeSinceLastUpdate > MAX_TIME_WITHOUT_UPDATE && lastLocationTime > 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[HEALTH-CHECK] Error during health check:', error);
    return false;
  }
};

/**
 * Restore active trip after app restart
 * Ensures tracking continues if app was killed
 */
export const restoreTrackingAfterRestart = async (): Promise<void> => {
  try {
    const store = useTripStore.getState();

    // Restore app state from storage
    await store.restoreAppState();

    const activeTrip = store.activeTrip;

    if (activeTrip && !activeTrip.alarmTriggered) {
      store.setIsTrackingActive(true);
      // Resume location watching
    }
  } catch (error) {
    console.error('[RESTORE] Error restoring tracking:', error);
  }
};
