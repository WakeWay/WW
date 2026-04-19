/**
 * Zustand store for application state management
 * Handles trips, location, permissions, and settings
 */

import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { useAuthStore } from './useAuthStore';
import type {
  TripStore,
  Trip,
  TripHistory,
  LocationData,
  LocationCoordinate,
  PermissionsState,
  AppSettings,
  AppError,
} from '@/types';
import { PermissionStatus } from '@/types';
import {
  saveTrips,
  loadTrips,
  saveActiveTrip,
  loadActiveTrip,
  saveTripHistory,
  loadTripHistory,
  saveSettings,
  loadSettings,
} from '@utils/storage';
import { DEFAULT_SETTINGS } from '@/constants';

/**
 * Generate a UUID v4 using expo-crypto
 * Compatible with React Native environment
 */
const generateUUID = (): string => {
  const bytes = Crypto.getRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // set version
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // set variant
  
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
};

interface TripStoreActions {
  // Trip management
  createTrip: (destination: Trip['destination'], radiusMeters: number, destinationName: string) => void;
  updateActiveTrip: (updates: Partial<Trip>) => void;
  endActiveTrip: () => void;
  startTracking: () => void;
  stopTracking: () => void;
  deleteTrip: (tripId: string) => void;
  
  // Location updates
  updateCurrentLocation: (location: LocationData) => void;
  updateDistanceToDestination: () => void;
  
  // Alarm management
  triggerAlarm: () => Promise<void>;
  dismissAlarm: () => void;
  snoozeAlarm: (minutes: number) => void;
  
  // Permissions
  updatePermissions: (permissions: Partial<PermissionsState>) => void;
  saveTrips: (trips: Trip[]) => void;
  saveTripHistory: (entry: TripHistory[]) => void;
  clearTripHistory: () => void;
  deleteTrip: (tripId: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  loadAppSettings: () => Promise<void>;
  
  // Error handling
  setError: (error: AppError | null) => void;
  
  // State restoration
  restoreAppState: () => Promise<void>;
  clearAppData: () => Promise<void>;
  clearSessionData: () => Promise<void>;
  
  // Loading
  setIsLoadingLocation: (loading: boolean) => void;
  setIsTrackingActive: (tracking: boolean) => void;
}

export type TripStoreType = TripStore & TripStoreActions;

const initialState: TripStore = {
  activeTrip: null,
  trips: [],
  tripHistory: [],
  currentLocation: null,
  permissions: {
    location: PermissionStatus.UNDETERMINED,
    locationBackground: PermissionStatus.UNDETERMINED,
    notifications: PermissionStatus.UNDETERMINED,
  },
  settings: DEFAULT_SETTINGS,
  error: null,
  isLoadingLocation: false,
  isTrackingActive: false,
};

export const useTripStore = create<TripStoreType>((set: any, get: any) => ({
  ...initialState,

  createTrip: (destination: LocationCoordinate, radiusMeters: number, destinationName: string) => {
    const newTrip: Trip = {
      id: generateUUID(),
      destination,
      destinationName,
      radiusMeters,
      startTime: Date.now(),
      isActive: true,
      alarmTriggered: false,
    };

    set((state: TripStore) => ({
      activeTrip: newTrip,
      trips: [...state.trips, newTrip],
      isTrackingActive: true,
    }));
    
    // Calculate initial distance immediately
    get().updateDistanceToDestination();

    // Persist active trip
    saveActiveTrip(newTrip).catch((error) => {
      console.error('Failed to persist active trip:', error);
    });
  },

  updateActiveTrip: (updates: Partial<Trip>) => {
    set((state: TripStore) => {
      if (!state.activeTrip) return state;
      
      const updated = { ...state.activeTrip, ...updates };
      
      // Update in trips array
      const updatedTrips = state.trips.map((trip) =>
        trip.id === updated.id ? updated : trip
      );

      // Persist updates
      saveTrips(updatedTrips).catch((error) => {
        console.error('Failed to persist trips:', error);
      });

      return {
        activeTrip: updated,
        trips: updatedTrips,
      };
    });
  },

  endActiveTrip: async () => {
    set((state: TripStore) => {
      if (!state.activeTrip) return state;

      const endedTrip = {
        ...state.activeTrip,
        isActive: false,
        endTime: Date.now(),
      };

      // Add to history
      const historyEntry: TripHistory = {
        tripId: endedTrip.id,
        destination: endedTrip.destination,
        destinationName: endedTrip.destinationName,
        radiusMeters: endedTrip.radiusMeters,
        startTime: endedTrip.startTime,
        endTime: endedTrip.endTime!,
        alarmTriggered: Boolean(endedTrip.alarmTriggerTime || endedTrip.alarmDismissed || endedTrip.alarmTriggered),
        alarmTriggerTime: endedTrip.alarmTriggerTime,
      };

      const updatedTrips = get().trips.map((trip: Trip) =>
        trip.id === endedTrip.id ? endedTrip : trip
      );

      const newHistory = [...get().tripHistory, historyEntry];
      saveTripHistory(newHistory).catch((error) => {
        console.error('Failed to save trip history:', error);
      });

      const authState = useAuthStore.getState();
      if (authState.user && authState.token) {
        // NOTE: In production or a real device, change localhost to your computer's IP
        fetch('https://wakeway.onrender.com/api/trips/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.token}`
          },
          body: JSON.stringify({
            tripId: historyEntry.tripId,
            destinationName: historyEntry.destinationName,
            radiusMeters: historyEntry.radiusMeters,
            startTime: historyEntry.startTime,
            endTime: historyEntry.endTime,
            alarmTriggered: historyEntry.alarmTriggered
          })
        }).catch(err => console.error('Failed to sync trip to custom backend:', err));
      }

      saveTrips(updatedTrips).catch((error) => {
        console.error('Failed to persist trips:', error);
      });

      saveActiveTrip(null).catch((error) => {
        console.error('Failed to clear active trip:', error);
      });

      return {
        activeTrip: null,
        trips: updatedTrips,
        tripHistory: [...state.tripHistory, historyEntry],
        isTrackingActive: false,
      };
    });
  },

  startTracking: () => {
    set({ isTrackingActive: true });
  },

  stopTracking: () => {
    set({ isTrackingActive: false });
  },

  updateCurrentLocation: (location: LocationData) => {
    set({ currentLocation: location });
  },

  updateDistanceToDestination: () => {
    const state = get();
    if (!state.activeTrip || !state.currentLocation) return;

    const { calculateDistance } = require('../utils/distanceCalculator') as any;
    const distance = calculateDistance(state.currentLocation, state.activeTrip.destination);

    get().updateActiveTrip({ distanceToDestination: distance });
  },

  triggerAlarm: async () => {
    set((state: TripStore) => {
      if (!state.activeTrip) return state;

      return {
        activeTrip: {
          ...state.activeTrip,
          alarmTriggered: true,
          alarmTriggerTime: Date.now(),
        },
      };
    });
  },

  dismissAlarm: () => {
    set((state: TripStore) => {
      if (!state.activeTrip) return state;

      // Only dismiss if it was actually triggered
      if (!state.activeTrip.alarmTriggered && !state.activeTrip.alarmTriggerTime) {
        return state;
      }

      return {
        activeTrip: {
          ...state.activeTrip,
          alarmTriggered: false,
          alarmDismissed: true,
        },
      };
    });
  },

  snoozeAlarm: (minutes: number) => {
    // Snooze logic: disable alarm for specified minutes
    set((state: TripStore) => {
      if (!state.activeTrip) return state;
      return {
        activeTrip: {
          ...state.activeTrip,
          alarmTriggered: false,
          snoozeUntil: Date.now() + minutes * 60 * 1000,
        },
      };
    });
  },

  updatePermissions: (permissions: Partial<PermissionsState>) => {
    set((state: TripStore) => ({
      permissions: {
        ...state.permissions,
        ...permissions,
      },
    }));
  },

  saveTrips: (trips: Trip[]) => {
    set({ trips });
    saveTrips(trips).catch(console.error);
  },

  saveTripHistory: (entry: TripHistory[]) => {
    set({ tripHistory: entry });
    saveTripHistory(entry).catch(console.error);
  },

  clearTripHistory: () => {
    set((state: TripStore) => {
      saveTripHistory([]).catch((error) => {
        console.error('Failed to clear trip history:', error);
      });

      const authState = useAuthStore.getState();
      if (authState.user && authState.token) {
        // NOTE: In production or a real device, change localhost to your computer's IP
        fetch('https://wakeway.onrender.com/api/trips/history', {
           method: 'DELETE',
           headers: { 'Authorization': `Bearer ${authState.token}` }
        }).catch(err => console.error('Failed to clear trip history on backend', err));
      }

      return { tripHistory: [] };
    });
  },

  deleteTrip: (tripId: string) => {
    set((state: TripStore) => {
      const newHistory = state.tripHistory.filter(t => t.tripId !== tripId);
      saveTripHistory(newHistory).catch((error) => {
        console.error('Failed to update trip history locally:', error);
      });

      const authState = useAuthStore.getState();
      if (authState.user && authState.token) {
        fetch(`https://wakeway.onrender.com/api/trips/history/${tripId}`, {
           method: 'DELETE',
           headers: { 'Authorization': `Bearer ${authState.token}` }
        }).catch(err => console.error('Failed to delete trip on backend', err));
      }

      return { tripHistory: newHistory };
    });
  },

  updateSettings: (newSettings: Partial<AppSettings>) => {
    set((state: TripStore) => {
      const updated = { ...state.settings, ...newSettings };
      saveSettings(updated).catch((error) => {
        console.error('Failed to save settings:', error);
      });

      return { settings: updated };
    });
  },

  loadAppSettings: async () => {
    try {
      const settings = await loadSettings();
      if (settings) {
        set({ settings });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  setError: (error: AppError | null) => {
    set({ error });
  },

  restoreAppState: async () => {
    try {
      const [activeTrip, trips, localTripHistory, settings] = await Promise.all([
        loadActiveTrip(),
        loadTrips(),
        loadTripHistory(),
        loadSettings(),
      ]);

      let tripHistory = localTripHistory || [];
      const authState = useAuthStore.getState();
      
      if (authState.user && authState.token) {
        try {
          const res = await fetch('https://wakeway.onrender.com/api/trips/history', {
             headers: { 'Authorization': `Bearer ${authState.token}` }
          });
          const data = await res.json();
          if (res.ok && data.trips && Array.isArray(data.trips)) {
             tripHistory = data.trips.map((row: any) => ({
               tripId: row.trip_id,
               destination: { latitude: 0, longitude: 0 },
               destinationName: row.destination_name,
               radiusMeters: row.radius_meters,
               startTime: new Date(row.start_time).getTime(),
               endTime: new Date(row.end_time).getTime(),
               alarmTriggered: row.alarm_triggered
             }));
             // Sync down to local storage
             require('@utils/storage').saveTripHistory(tripHistory).catch(() => {});
          }
        } catch (e) {
          console.error('Failed to fetch remote history', e);
        }
      }

      set({
        activeTrip,
        trips,
        tripHistory,
        settings: settings || DEFAULT_SETTINGS,
      });
    } catch (error) {
      console.error('Failed to restore app state:', error);
    }
  },

  clearAppData: async () => {
    const { clearAllStorage } = require('@utils/storage');
    try {
      await clearAllStorage();
      set(initialState);
    } catch (error) {
      console.error('Failed to clear app data:', error);
    }
  },

  clearSessionData: async () => {
    const { clearSessionData } = require('@utils/storage');
    try {
      await clearSessionData();
      set({
        activeTrip: null,
        trips: [],
        tripHistory: []
      });
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  },

  clearTripHistory: () => {
    set((state: TripStore) => {
      saveTripHistory([]).catch((error) => {
        console.error('Failed to clear trip history:', error);
      });

      const authState = useAuthStore.getState();
      if (authState.user && authState.token) {
        // NOTE: In production or a real device, change localhost to your computer's IP
        fetch('https://wakeway.onrender.com/api/trips/history', {
           method: 'DELETE',
           headers: { 'Authorization': `Bearer ${authState.token}` }
        }).catch(err => console.error('Failed to clear trip history on backend', err));
      }

      return { tripHistory: [] };
    });
  },

  setIsLoadingLocation: (loading: boolean) => {
    set({ isLoadingLocation: loading });
  },

  setIsTrackingActive: (tracking: boolean) => {
    set({ isTrackingActive: tracking });
  },
}));
