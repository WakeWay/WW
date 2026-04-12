/**
 * Core type definitions for WakeWay application
 */

// Location Types
export interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

export interface LocationData extends LocationCoordinate {
  accuracy: number | null;
  altitudeAccuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

// Trip Types
export interface Trip {
  id: string;
  destination: LocationCoordinate;
  destinationName: string;
  radiusMeters: number;
  startTime: number;
  endTime?: number;
  isActive: boolean;
  alarmTriggered: boolean;
  alarmTriggerTime?: number;
  alarmDismissed?: boolean;
  snoozeUntil?: number;
  currentLocation?: LocationData;
  distanceToDestination?: number;
}

export interface TripHistory {
  tripId: string;
  destination: LocationCoordinate;
  destinationName: string;
  radiusMeters: number;
  startTime: number;
  endTime: number;
  alarmTriggered: boolean;
  alarmTriggerTime?: number;
}

// Notification Types
export interface AlarmNotification {
  id: string;
  tripId: string;
  timestamp: number;
  title: string;
  body: string;
  duration: number;
}

// Permission Types
export enum PermissionStatus {
  UNDETERMINED = 'undetermined',
  DENIED = 'denied',
  GRANTED = 'granted'
}

export interface PermissionsState {
  location: PermissionStatus;
  locationBackground: PermissionStatus;
  notifications: PermissionStatus;
}

// Settings Types
export interface AppSettings {
  autoStartTracking: boolean;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  snoozeEnabled: boolean;
  snoozeMinutes: number;
  themeMode: 'system' | 'light' | 'dark';
  defaultRadius: number;
  notificationVolume: number;
  customAlarmSoundUri: string | null;
  customAlarmSoundName: string | null;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  context?: Record<string, any>;
  timestamp: number;
}

// Store State Types
export interface TripStore {
  activeTrip: Trip | null;
  trips: Trip[];
  tripHistory: TripHistory[];
  currentLocation: LocationData | null;
  permissions: PermissionsState;
  settings: AppSettings;
  error: AppError | null;
  isLoadingLocation: boolean;
  isTrackingActive: boolean;
}
