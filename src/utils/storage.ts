/**
 * Storage utility functions for persisting app state
 * Uses AsyncStorage as primary, MMKV as fallback for sensitive data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TripHistory, Trip, AppSettings } from '@/types';

const STORAGE_KEYS = {
  TRIPS: '@wakeway_trips',
  TRIP_HISTORY: '@wakeway_trip_history',
  ACTIVE_TRIP: '@wakeway_active_trip',
  SETTINGS: '@wakeway_settings',
  ERROR_LOG: '@wakeway_error_log',
  TERMS_ACCEPTED: '@wakeway_terms_accepted',
};

// Debounce timers and pending data for writes
const debounceTimers: Record<string, NodeJS.Timeout> = {};
const pendingData: Record<string, any> = {};

// Track in-flight read operations to prevent duplicate requests
const readOperations: Record<string, Promise<any>> = {};

/**
 * Debounced storage write to batch multiple updates
 */
const debounceWrite = (key: string, data: any, delayMs = 1000): Promise<void> => {
  return new Promise((resolve) => {
    // Store pending data
    pendingData[key] = data;

    // Clear existing timer
    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key]);
    }

    // Set new timer
    debounceTimers[key] = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(pendingData[key]));
        delete debounceTimers[key];
        delete pendingData[key];
        resolve();
      } catch (error) {
        console.error(`Failed to write ${key}:`, error);
        resolve(); // Don't reject to prevent callback accumulation
      }
    }, delayMs);
  });
};

/**
 * Deduplicated read operation to prevent simultaneous multi-get calls
 */
const dedupRead = <T,>(key: string, readFn: () => Promise<T>): Promise<T> => {
  // If a read is already in flight for this key, return that promise
  if (readOperations[key]) {
    return readOperations[key];
  }

  // Start new read operation
  const operation = readFn().finally(() => {
    // Clean up operation tracking after completion
    delete readOperations[key];
  });

  readOperations[key] = operation;
  return operation;
};

/**
 * Save trips to persistent storage (debounced)
 */
export const saveTrips = async (trips: Trip[]): Promise<void> => {
  return debounceWrite(STORAGE_KEYS.TRIPS, trips, 1000);
};

/**
 * Load trips from persistent storage (deduplicated)
 */
export const loadTrips = async (): Promise<Trip[]> => {
  return dedupRead(STORAGE_KEYS.TRIPS, async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TRIPS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load trips:', error);
      return [];
    }
  });
};

/**
 * Save active trip to trigger restoration on app restart (debounced)
 */
export const saveActiveTrip = async (trip: Trip | null): Promise<void> => {
  if (trip) {
    return debounceWrite(STORAGE_KEYS.ACTIVE_TRIP, trip, 1000);
  } else {
    return new Promise((resolve) => {
      AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP)
        .then(() => resolve())
        .catch(() => resolve());
    });
  }
};

/**
 * Load active trip when app restarts (deduplicated)
 */
export const loadActiveTrip = async (): Promise<Trip | null> => {
  return dedupRead(STORAGE_KEYS.ACTIVE_TRIP, async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load active trip:', error);
      return null;
    }
  });
};

/**
 * Save trip history for analytics/user review (debounced)
 */
export const saveTripHistory = async (history: TripHistory[]): Promise<void> => {
  return debounceWrite(STORAGE_KEYS.TRIP_HISTORY, history, 1000);
};

/**
 * Load trip history (deduplicated)
 */
export const loadTripHistory = async (): Promise<TripHistory[]> => {
  return dedupRead(STORAGE_KEYS.TRIP_HISTORY, async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TRIP_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load trip history:', error);
      return [];
    }
  });
};

/**
 * Save app settings (debounced)
 */
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  return debounceWrite(STORAGE_KEYS.SETTINGS, settings, 1000);
};

/**
 * Load app settings (deduplicated)
 */
export const loadSettings = async (): Promise<AppSettings | null> => {
  return dedupRead(STORAGE_KEYS.SETTINGS, async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return null;
    }
  });
};

/**
 * Clear all storage data (for testing or reset)
 */
export const clearAllStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw error;
  }
};

/**
 * Clear only session-related storage (trips, history) to preserve settings on logout
 */
export const clearSessionData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TRIPS,
      STORAGE_KEYS.TRIP_HISTORY,
      STORAGE_KEYS.ACTIVE_TRIP
    ]);
  } catch (error) {
    console.error('Failed to clear session data:', error);
    throw error;
  }
};

/**
 * Check if the user has formally accepted the Terms & Conditions
 */
export const checkTermsAccepted = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED);
    return data === 'true';
  } catch (error) {
    return false;
  }
};

/**
 * Set the user's Terms & Conditions acceptance status
 */
export const setTermsAccepted = async (accepted: boolean): Promise<void> => {
  try {
    if (accepted) {
      await AsyncStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, 'true');
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.TERMS_ACCEPTED);
    }
  } catch (error) {
    console.error('Failed to save terms status:', error);
  }
};
