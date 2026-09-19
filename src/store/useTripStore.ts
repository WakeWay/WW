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
  Waypoint,
  TripShare,
  TripShareStatus,
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
import { advanceWaypoint } from '@utils/routeProgress';
import { getApiUrl, getOptionalApiUrl } from '@/config';

/**
 * Generate a UUID v4 using expo-crypto
 * Compatible with React Native environment (Expo SDK 50+)
 */
const generateUUID = (): string => {
  return Crypto.randomUUID();
};

let lastSharedLocationAt = 0;

interface TripStoreActions {
  // Trip management
  createTrip: (waypoints: Omit<Waypoint, 'id'>[]) => void;
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

  // Live trip sharing
  createTripShare: (expiresInHours?: number) => Promise<TripShare>;
  updateTripShare: (status?: TripShareStatus, eventType?: 'near_destination' | 'trip_completed') => Promise<void>;
  revokeTripShare: () => Promise<void>;

  // Permissions
  updatePermissions: (permissions: Partial<PermissionsState>) => void;

  // History / trips
  saveTrips: (trips: Trip[]) => void;
  saveTripHistory: (entry: TripHistory[]) => void;
  clearTripHistory: () => void;

  // Settings
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
  activeShare: null,
};

export const useTripStore = create<TripStoreType>((set: any, get: any) => ({
  ...initialState,

  createTrip: (waypointsData: Omit<Waypoint, 'id'>[]) => {
    const waypoints = waypointsData.map(wp => ({ ...wp, id: generateUUID(), triggered: false }));
    const newTrip: Trip = {
      id: generateUUID(),
      waypoints,
      currentWaypointIndex: 0,
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
      saveActiveTrip(updated).catch((error) => {
        console.error('Failed to persist active trip:', error);
      });

      return {
        activeTrip: updated,
        trips: updatedTrips,
      };
    });
  },

  endActiveTrip: async () => {
    const stateBeforeEnd = get();
    if (stateBeforeEnd.activeShare && stateBeforeEnd.activeTrip) {
      stateBeforeEnd.updateTripShare('completed', 'trip_completed').catch((error) => {
        console.error('Failed to complete trip share:', error);
      });
    }

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
        waypoints: endedTrip.waypoints,
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
        fetch(`${getApiUrl()}/trips/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.token}`
          },
          body: JSON.stringify({
            tripId: historyEntry.tripId,
            waypoints: historyEntry.waypoints,
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
    const state = get();
    set({ currentLocation: location });

    if (state.activeShare && state.activeTrip && Date.now() - lastSharedLocationAt >= 15000) {
      lastSharedLocationAt = Date.now();
      fetch(`${getApiUrl()}/trips/${state.activeTrip.id}/share/${state.activeShare.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({
          currentWaypointIndex: state.activeTrip.currentWaypointIndex,
          location: { latitude: location.latitude, longitude: location.longitude },
        }),
      }).catch((error) => console.error('Failed to update shared location:', error));
    }
  },

  updateDistanceToDestination: () => {
    const state = get();
    if (!state.activeTrip || !state.currentLocation || state.activeTrip.currentWaypointIndex >= state.activeTrip.waypoints.length) return;

    const currentWaypoint = state.activeTrip.waypoints[state.activeTrip.currentWaypointIndex];
    const { calculateDistance } = require('../utils/distanceCalculator') as any;
    const distance = calculateDistance(state.currentLocation, currentWaypoint.location);

    get().updateActiveTrip({ distanceToDestination: distance });
  },

  triggerAlarm: async () => {
    const state = get();
    if (!state.activeTrip || state.activeTrip.alarmTriggered) return;

    const updatedTrip = {
      ...state.activeTrip,
      alarmTriggered: true,
      alarmTriggerTime: Date.now(),
    };
    const updatedTrips = state.trips.map((trip: Trip) =>
      trip.id === updatedTrip.id ? updatedTrip : trip
    );

    set({ activeTrip: updatedTrip, trips: updatedTrips });
    state.updateTripShare('active', 'near_destination').catch((error) => {
      console.error('Failed to publish near-destination event:', error);
    });
    await Promise.all([
      saveTrips(updatedTrips),
      saveActiveTrip(updatedTrip),
    ]);
  },

  dismissAlarm: () => {
    const state = get();
    if (!state.activeTrip || (!state.activeTrip.alarmTriggered && !state.activeTrip.alarmTriggerTime)) {
      return;
    }

    const activeTrip = state.activeTrip;
    const advancement = advanceWaypoint(activeTrip.waypoints, activeTrip.currentWaypointIndex);
    const updatedTrip = {
      ...activeTrip,
      waypoints: advancement.waypoints,
      currentWaypointIndex: advancement.nextWaypointIndex,
      alarmTriggered: false,
      alarmDismissed: advancement.isComplete,
      snoozeUntil: undefined,
      distanceToDestination: advancement.isComplete ? 0 : undefined,
    };
    const updatedTrips = state.trips.map((trip: Trip) =>
      trip.id === updatedTrip.id ? updatedTrip : trip
    );

    set({ activeTrip: updatedTrip, trips: updatedTrips });

    if (advancement.isComplete) {
      get().endActiveTrip();
      return;
    }

    saveTrips(updatedTrips).catch((error) => {
      console.error('Failed to persist trips after waypoint completion:', error);
    });
    saveActiveTrip(updatedTrip).catch((error) => {
      console.error('Failed to persist active trip after waypoint completion:', error);
    });
  },

  snoozeAlarm: (minutes: number) => {
    // Snooze logic: disable alarm for specified minutes
    const state = get();
    if (!state.activeTrip) return;

    const updatedTrip = {
      ...state.activeTrip,
      alarmTriggered: false,
      snoozeUntil: Date.now() + minutes * 60 * 1000,
    };
    const updatedTrips = state.trips.map((trip: Trip) =>
      trip.id === updatedTrip.id ? updatedTrip : trip
    );

    set({ activeTrip: updatedTrip, trips: updatedTrips });
    saveTrips(updatedTrips).catch((error) => {
      console.error('Failed to persist trips after snooze:', error);
    });
    saveActiveTrip(updatedTrip).catch((error) => {
      console.error('Failed to persist active trip after snooze:', error);
    });
  },

  createTripShare: async (expiresInHours = 24) => {
    const state = get();
    const authState = useAuthStore.getState();
    if (!state.activeTrip || !authState.token) throw new Error('Sign in and start a trip before sharing');

    const currentWaypoint = state.activeTrip.waypoints[state.activeTrip.currentWaypointIndex];
    const shareEndpoint = `${getApiUrl()}/trips/${state.activeTrip.id}/share`;
    console.log('[Share] POST', shareEndpoint);
    console.log('[Share] destination:', currentWaypoint?.location, 'name:', currentWaypoint?.name);

    let response: Response;
    try {
      response = await fetch(shareEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify({
          destinationName: currentWaypoint?.name || 'Destination',
          destination: currentWaypoint?.location,
          currentWaypointIndex: state.activeTrip.currentWaypointIndex,
          expiresInHours,
        }),
      });
    } catch (networkErr: any) {
      console.error('[Share] Network error:', networkErr?.message ?? networkErr);
      throw networkErr;
    }

    const rawText = await response.text();
    console.log('[Share] HTTP', response.status, '| body:', rawText.slice(0, 300));

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Server returned non-JSON (HTTP ${response.status}): ${rawText.slice(0, 120)}`);
    }

    if (!response.ok) throw new Error(data.error || 'Unable to create share link');

    // The public share page is /share/:token — not under /api/
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
    const share: TripShare = {
      ...data.share,
      token: data.token,
      shareUrl: `${baseUrl}/share/${data.token}`,
    };
    set({ activeShare: share });
    return share;
  },

  updateTripShare: async (status = 'active', eventType) => {
    const state = get();
    const token = useAuthStore.getState().token;
    if (!state.activeShare || !state.activeTrip || !token) return;

    const response = await fetch(`${getApiUrl()}/trips/${state.activeTrip.id}/share/${state.activeShare.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        eventType,
        currentWaypointIndex: state.activeTrip.currentWaypointIndex,
        location: state.currentLocation
          ? { latitude: state.currentLocation.latitude, longitude: state.currentLocation.longitude }
          : undefined,
      }),
    });
    if (!response.ok) throw new Error('Unable to update trip share');
    if (status === 'completed') set({ activeShare: null });
  },

  revokeTripShare: async () => {
    const state = get();
    const token = useAuthStore.getState().token;
    if (!state.activeShare || !state.activeTrip || !token) return;

    const response = await fetch(`${getApiUrl()}/trips/${state.activeTrip.id}/share/${state.activeShare.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to revoke trip share');
    set({ activeShare: null });
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
        fetch(`${getApiUrl()}/trips/history`, {
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
        fetch(`${getApiUrl()}/trips/history/${tripId}`, {
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
      
      const apiUrl = getOptionalApiUrl();
      if (authState.user && authState.token && apiUrl) {
        // Render free-tier servers sleep after inactivity; retry a few times to
        // give the server a chance to wake up before giving up.
        const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs: number) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
        };

        let fetched = false;
        for (let attempt = 0; attempt < 3 && !fetched; attempt++) {
          try {
            if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 2000));
            const historyUrl = `${apiUrl}/trips/history`;
            if (attempt === 0) console.log('[History] Fetching:', historyUrl);
            const res = await fetchWithTimeout(
              historyUrl,
              { headers: { 'Authorization': `Bearer ${authState.token}` } },
              15000 // 15 s per attempt
            );
            if (!res.ok) {
              const text = await res.text();
              console.warn(`[History] HTTP ${res.status}:`, text.slice(0, 200));
              fetched = true; // don't retry on HTTP errors
            } else {
              const data = await res.json();
              if (data.trips && Array.isArray(data.trips)) {
                tripHistory = data.trips.map((row: any) => ({
                  tripId: row.trip_id,
                  waypoints: row.waypoints || [],
                  startTime: new Date(row.start_time).getTime(),
                  endTime: new Date(row.end_time).getTime(),
                  alarmTriggered: row.alarm_triggered,
                }));
                require('@utils/storage').saveTripHistory(tripHistory).catch(() => {});
              }
              fetched = true;
            }
          } catch (e: any) {
            console.warn(`[History] Attempt ${attempt + 1} error:`, e?.message ?? e);
          }
        }
        if (!fetched) console.error('Failed to fetch remote history after 3 attempts');
      }

      // Clear old format trips
      if (activeTrip && !activeTrip.waypoints) {
        saveActiveTrip(null).catch(() => {});
      }

      set({
        activeTrip: (activeTrip && activeTrip.waypoints) ? activeTrip : null,
        trips: (trips || []).filter(t => t.waypoints),
        tripHistory: tripHistory.filter(t => t.waypoints),
        settings: settings || DEFAULT_SETTINGS,
        activeShare: null,
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
        tripHistory: [],
        activeShare: null,
      });
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  },

  setIsLoadingLocation: (loading: boolean) => {
    set({ isLoadingLocation: loading });
  },

  setIsTrackingActive: (tracking: boolean) => {
    set({ isTrackingActive: tracking });
  },
}));
