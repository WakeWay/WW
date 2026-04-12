/**
 * Custom hooks for location and tracking functionality
 */

import { useEffect, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useTripStore, TripStoreType } from '@store/useTripStore';
import { locationService } from '@services/locationService';
import { notificationService } from '@services/notificationService';
import type { LocationData, Trip } from '@/types';
import { isSignificantLocationChange } from '@utils/distanceCalculator';
import { handleAppStateChange } from '@tasks/backgroundTasks';
import { LOCATION_UPDATE_INTERVAL_MS } from '@/constants';

/**
 * Hook for managing location updates
 */
export const useLocationTracking = (): {
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  error: string | null;
} => {
  const store = useTripStore();
  const [error, setError] = useState<string | null>(null);

  const startTracking = useCallback(async () => {
    try {
      setError(null);

      // Start foreground location watching
      await locationService.startLocationWatching((location: LocationData) => {
        const storeState = useTripStore.getState();
        storeState.updateCurrentLocation(location);
        storeState.updateDistanceToDestination();

        // Check for alarm trigger
        if (storeState.activeTrip && !storeState.activeTrip.alarmTriggered && !storeState.activeTrip.alarmDismissed) {
          if (storeState.activeTrip.snoozeUntil && Date.now() < storeState.activeTrip.snoozeUntil) {
            return; // Still snoozing
          }
          const { isWithinRadius } = require('../utils/distanceCalculator');
          if (isWithinRadius(location, storeState.activeTrip.destination, storeState.activeTrip.radiusMeters)) {
            storeState.triggerAlarm();
            notificationService.triggerFullAlarm(storeState.activeTrip);

          }
        }
      });

      // Start background location task
      await locationService.startBackgroundLocationTask();

      store.setIsTrackingActive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start tracking';
      setError(message);
      console.error('Error starting tracking:', err);
    }
  }, [store]);

  const stopTracking = useCallback(async () => {
    try {
      setError(null);
      locationService.stopLocationWatching();
      await locationService.stopBackgroundLocationTask();
      store.setIsTrackingActive(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop tracking';
      setError(message);
      console.error('Error stopping tracking:', err);
    }
  }, [store]);

  return {
    isTracking: store.isTrackingActive,
    startTracking,
    stopTracking,
    error,
  };
};

/**
 * Hook for managing permissions
 */
export const useLocationPermissions = (): {
  permissions: any;
  requestForegroundPermission: () => Promise<boolean>;
  requestBackgroundPermission: () => Promise<boolean>;
  allPermissionsGranted: boolean;
} => {
  const store = useTripStore();
  const [loading, setLoading] = useState(false);

  const requestForegroundPermission = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      const status = await locationService.requestForegroundPermission();
      store.updatePermissions({ location: status });
      setLoading(false);
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting foreground permission:', error);
      setLoading(false);
      return false;
    }
  }, [store]);

  const requestBackgroundPermission = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      const status = await locationService.requestBackgroundPermission();
      store.updatePermissions({ locationBackground: status });
      setLoading(false);
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting background permission:', error);
      setLoading(false);
      return false;
    }
  }, [store]);

  const allPermissionsGranted = useCallback((): boolean => {
    const perms = store.permissions;
    return perms.location === 'granted' && perms.locationBackground === 'granted';
  }, [store.permissions]);

  return {
    permissions: store.permissions,
    requestForegroundPermission,
    requestBackgroundPermission,
    allPermissionsGranted: allPermissionsGranted(),
  };
};

/**
 * Hook for managing active trip
 */
export const useActiveTrip = (): {
  activeTrip: Trip | null;
  distanceToDestination: number | null;
  createTrip: (destination: any, radius: number, name: string) => void;
  endTrip: () => Promise<void>;
  currentLocation: LocationData | null;
} => {
  const store = useTripStore();

  const createTrip = useCallback(
    (destination: any, radius: number, name: string) => {
      store.createTrip(destination, radius, name);
    },
    [store]
  );

  const endTrip = useCallback(async () => {
    await store.endActiveTrip();
  }, [store]);

  return {
    activeTrip: store.activeTrip,
    distanceToDestination: store.activeTrip?.distanceToDestination || null,
    createTrip,
    endTrip,
    currentLocation: store.currentLocation,
  };
};

/**
 * Hook for managing alarm
 */
export const useAlarm = (): {
  isAlarmActive: boolean;
  dismissAlarm: () => Promise<void>;
  snoozeAlarm: (minutes: number) => void;
} => {
  const store = useTripStore();

  const dismissAlarm = useCallback(async () => {
    await notificationService.dismissAlarm();
  }, []);

  const snoozeAlarm = useCallback((minutes: number) => {
    notificationService.snoozeAlarm(minutes);
  }, []);

  return {
    isAlarmActive: store.activeTrip?.alarmTriggered || false,
    dismissAlarm,
    snoozeAlarm,
  };
};

/**
 * Hook for app lifecycle management
 */
export const useAppLifecycle = (): void => {
  const store = useTripStore();
  const [hasRestored, setHasRestored] = useState(false);

  useEffect(() => {
    // Restore app state on mount (only once)
    if (!hasRestored) {
      store.restoreAppState();
      setHasRestored(true);
    }

    // Check permission status on mount
    (async () => {
      const permissions = await locationService.checkPermissions();
      store.updatePermissions(permissions);

      // Setup Notifications
      try {
        await notificationService.requestPermissions();
        await notificationService.createAlarmChannel();
      } catch (error) {
        console.error('Failed to setup notifications:', error);
      }
    })();

    // Setup app state listener
    const subscription = AppState.addEventListener('change', (state) => {
      handleAppStateChange(state as 'active' | 'background' | 'inactive');
    });

    // Setup notification response listener
    const unsubscribe = notificationService.setupNotificationResponseListener((notification) => {

    });

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, []); // Empty dependency array - run only once on mount
};

/**
 * Hook for detecting and filtering location Updates
 */
export const useFilteredLocationUpdates = (
  minDistanceMeters: number = 10
): {
  filteredLocation: LocationData | null;
} => {
  const store = useTripStore();
  const [filteredLocation, setFilteredLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    if (!store.currentLocation) return;

    if (
      !filteredLocation ||
      isSignificantLocationChange(filteredLocation, store.currentLocation, minDistanceMeters)
    ) {
      setFilteredLocation(store.currentLocation);
    }
  }, [store.currentLocation, filteredLocation, minDistanceMeters]);

  return { filteredLocation };
};
