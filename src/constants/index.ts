/**
 * Application constants and configuration values
 */

// Location service constants
export const LOCATION_TASK_NAME = 'WAKEWAY_LOCATION_TRACKING';
export const LOCATION_UPDATE_INTERVAL_MS = 15000; // Update every 15 seconds
export const MIN_LOCATION_CHANGE_METERS = 10; // Minimum distance to consider as location change
export const MAX_SPEED_MPS = 100; // Max ~360 km/h for trains/planes

// Alarm/Notification constants
export const ALARM_NOTIFICATION_CHANNEL_ID = 'alarm_channel';
export const ALARM_SOUND_URI = 'notification_alarm.mp3'; // Should be in assets
export const ALARM_VIBRATION_PATTERN = [0, 250, 250, 250]; // Vibration pattern

// Distance calculation constants
export const DEFAULT_RADIUS_METERS = 500; // Default 500m radius
export const RADIUS_OPTIONS = [100, 200, 500, 1000, 2000, 5000]; // Predefined radius options
export const GPS_ACCURACY_THRESHOLD_METERS = 50; // Consider GPS accurate if within 50m

// Timing constants
export const SNOOZE_DURATIONS_MINUTES = [1, 3, 5, 10];
export const ALARM_DURATION_SECONDS = 60; // Auto snooze after 60 seconds
export const AUTO_SNOOZE_MINUTES = 2; // Auto snooze duration if no response
export const LOCATION_TIMEOUT_MILLISECONDS = 30000; // Timeout for location request

// Permission messages
export const PERMISSION_MESSAGES = {
  LOCATION_FOREGROUND: 'WakeWay needs location access to track your journey',
  LOCATION_BACKGROUND: 'WakeWay needs background location access to alert you when near your stop',
  NOTIFICATIONS: 'WakeWay needs notification permission to alert you about your stop',
};

// Error messages
export const ERROR_MESSAGES = {
  NO_LOCATION: 'Unable to get your location. Please check location permissions.',
  LOCATION_PERMISSION_DENIED: 'Location permission denied. The app cannot track your journey.',
  BACKGROUND_LOCATION_DENIED: 'Background location permission denied. Alarm may not work when app is closed.',
  NOTIFICATION_PERMISSION_DENIED: 'Notification permission denied. You won\'t receive alerts.',
  NO_DESTINATION: 'Please select a destination before starting trip.',
  INVALID_RADIUS: 'Radius must be between 50m and 5000m.',
  TRIP_LOAD_FAILED: 'Failed to load previous trip. Starting fresh.',
  BACKGROUND_TASK_FAILED: 'Background location tracking failed. Please restart the app.',
};

// UI/UX constants
export const ANIMATION_DURATION_MS = 300;
export const TOAST_DURATION_MS = 3000;
export const MAP_ZOOM_LEVEL = 16;

// Default settings
export const DEFAULT_SETTINGS = {
  autoStartTracking: false,
  vibrationEnabled: true,
  soundEnabled: true,
  snoozeEnabled: true,
  snoozeMinutes: 3,
  themeMode: 'system' as 'system' | 'light' | 'dark',
  defaultRadius: DEFAULT_RADIUS_METERS,
  notificationVolume: 0.8,
  customAlarmSoundUri: null,
  customAlarmSoundName: null,
};

// API/Service timeouts
export const API_TIMEOUT_MS = 10000;
export const LOCATION_RETRY_ATTEMPTS = 3;
export const LOCATION_RETRY_DELAY_MS = 2000;

// Testing/Debug constants
const isDevelopment = __DEV__ || false; // __DEV__ is available in React Native/Expo
export const DEBUG_MODE = isDevelopment; // false in production
export const LOG_LOCATION_UPDATES = DEBUG_MODE;
export const LOG_DISTANCE_CALCULATIONS = DEBUG_MODE;
