/**
 * Notification service for managing alarms and notifications
 */

import { Vibration, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { useTripStore } from '@store/useTripStore';
import {
  ALARM_NOTIFICATION_CHANNEL_ID,
  TRACKING_NOTIFICATION_CHANNEL_ID,
  ALARM_SOUND_URI,
  ALARM_VIBRATION_PATTERN,
  ALARM_DURATION_SECONDS,
  AUTO_SNOOZE_MINUTES,
} from '@/constants';
import type { Trip } from '@/types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private alarmSound: Audio.Sound | null = null;
  private alarmTimeoutId: any = null;
  /** Fixed identifier for the persistent trip-status notification */
  private readonly TRIP_NOTIF_ID = 'wakeway_trip_active';
  private tripNotifScheduledId: string | null = null;

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Create notification channel for alarms (Android)
   */
  async createAlarmChannel(): Promise<void> {
    if (!('setNotificationChannelAsync' in Notifications)) {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(ALARM_NOTIFICATION_CHANNEL_ID, {
        name: 'Alarm',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: ALARM_VIBRATION_PATTERN,
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
      });

      // Also create the low-priority tracking channel
      await Notifications.setNotificationChannelAsync(TRACKING_NOTIFICATION_CHANNEL_ID, {
        name: 'Trip Tracking',
        importance: Notifications.AndroidImportance.LOW,
        sound: undefined,
        enableVibrate: false,
        showBadge: false,
      });
    } catch (error) {
      console.error('Failed to create alarm channel:', error);
    }
  }

  /**
   * Show / update the persistent trip-status notification.
   * Safe to call on every location update — cancels the previous one first
   * so the notification is refreshed in place rather than stacking.
   */
  async showTripNotification(trip: {
    destinationName: string;
    distanceToDestination?: number | null;
    radiusMeters: number;
  }): Promise<void> {
    try {
      // Cancel previous instance so the tray entry is replaced, not duplicated
      if (this.tripNotifScheduledId) {
        await Notifications.dismissNotificationAsync(this.tripNotifScheduledId).catch(() => {});
      }

      const distM = trip.distanceToDestination ?? null;
      const distText = distM != null
        ? distM >= 1000
          ? `${(distM / 1000).toFixed(1)} km away`
          : `${Math.round(distM)} m away`
        : 'Calculating distance…';

      const alertText = distM != null && distM <= trip.radiusMeters
        ? '🔔 Approaching your stop!'
        : `📍 ${distText}`;

      this.tripNotifScheduledId = await Notifications.scheduleNotificationAsync({
        identifier: this.TRIP_NOTIF_ID,
        content: {
          title: `🚌 Trip to ${trip.destinationName}`,
          body: alertText,
          data: { type: 'trip_status' },
          sound: false as any,
          sticky: true,
          autoDismiss: false,
          ...(Platform.OS === 'android' && {
            channelId: TRACKING_NOTIFICATION_CHANNEL_ID,
            ongoing: true,
            color: '#6366F1',
            smallIcon: 'ic_launcher',
          }),
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Failed to show trip notification:', error);
    }
  }

  /**
   * Dismiss the persistent trip-status notification
   */
  async clearTripNotification(): Promise<void> {
    try {
      if (this.tripNotifScheduledId) {
        await Notifications.dismissNotificationAsync(this.tripNotifScheduledId).catch(() => {});
        this.tripNotifScheduledId = null;
      }
      // Belt-and-suspenders: dismiss by identifier too
      await Notifications.dismissNotificationAsync(this.TRIP_NOTIF_ID).catch(() => {});
    } catch (_) {}
  }

  /**
   * Send arrival alarm notification
   */
  async sendAlarmNotification(trip: Trip): Promise<string | null> {
    try {
      // First ensure the category is registered
      await Notifications.setNotificationCategoryAsync('alarm', [
        {
          identifier: 'snooze',
          buttonTitle: 'Snooze (5m)',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'stop',
          buttonTitle: 'Stop Alarm',
          options: { isDestructive: true, opensAppToForeground: false },
        },
      ]);

      const currentWaypoint = trip.waypoints[trip.currentWaypointIndex];
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Stop Alert',
          body: `You are near ${currentWaypoint?.name || 'your destination'}`,
          data: {
            tripId: trip.id,
            destination: currentWaypoint?.name || 'Destination',
          },
          sound: 'default',
          vibrate: ALARM_VIBRATION_PATTERN,
          badge: 1,
          priority: 'max',
          categoryIdentifier: 'alarm',
        },
        trigger: {
          seconds: 1,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to send alarm notification:', error);
      return null;
    }
  }

  /**
   * Play alarm sound with repetition
   */
  async playAlarmSound(repeat: boolean = true): Promise<void> {
    try {
      // Ensure audio is configured to play in background and bypass silent mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Load sound
      if (!this.alarmSound) {
        this.alarmSound = new Audio.Sound();
        const customUri = useTripStore.getState().settings.customAlarmSoundUri;
        // Try to load alarm sound
        try {
          if (customUri) {
            await this.alarmSound.loadAsync({ uri: customUri });
          } else {
            await this.alarmSound.loadAsync(require('../../assets/fahhhhh.mp3'));
          }
        } catch (err) {

          // Fallback to default
          if (customUri) {
            try {
              await this.alarmSound.loadAsync(require('../../assets/fahhhhh.mp3'));
            } catch (fallbackErr) {

              return;
            }
          } else {
            return;
          }
        }
      }

      // Set up to loop
      await this.alarmSound.setIsLoopingAsync(repeat);
      await this.alarmSound.setVolumeAsync(useTripStore.getState().settings.notificationVolume);

      // Play sound
      await this.alarmSound.playAsync();
    } catch (error) {
      console.error('Failed to play alarm sound:', error);
      // Fallback: use system notification sound
    }
  }

  /**
   * Trigger full alarm (sound + vibration + notification)
   */
  async triggerFullAlarm(trip: Trip): Promise<void> {
    try {
      const store = useTripStore.getState();
      const settings = store.settings;

      // Play sound if enabled
      if (settings.soundEnabled) {
        await this.playAlarmSound();
      }

      // Vibrate if enabled
      if (settings.vibrationEnabled) {
        await this.vibrateDevice();
      }

      // Send notification
      await this.sendAlarmNotification(trip);

      // Auto-snooze after configured duration if user hasn't intervened
      this.alarmTimeoutId = setTimeout(() => {

        this.snoozeAlarm(AUTO_SNOOZE_MINUTES);
      }, ALARM_DURATION_SECONDS * 1000);
    } catch (error) {
      console.error('Failed to trigger full alarm:', error);
    }
  }

  /**
   * Vibrate device
   */
  async vibrateDevice(pattern: number[] = ALARM_VIBRATION_PATTERN): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      if (Vibration && Vibration.vibrate) {
        Vibration.vibrate(pattern, true);
      }
    } catch (error) {
      console.error('Failed to vibrate device:', error);
    }
  }

  /**
   * Stop hardware alarm capabilities without touching store state
   */
  async stopHardwareAlarm(): Promise<void> {
    try {
      // Stop vibration
      if (Platform.OS !== 'web' && Vibration && Vibration.cancel) {
        Vibration.cancel();
      }

      // Stop sound
      if (this.alarmSound) {
        const status = await this.alarmSound.getStatusAsync();
        if (status.isLoaded) {
          await this.alarmSound.stopAsync();
        }
      }

      // Clear timeout
      if (this.alarmTimeoutId) {
        clearTimeout(this.alarmTimeoutId);
        this.alarmTimeoutId = null;
      }
    } catch (error) {
      console.error('Failed to stop hardware alarm:', error);
    }
  }

  /**
   * Dismiss alarm
   */
  async dismissAlarm(): Promise<void> {
    try {
      await this.stopHardwareAlarm();

      // Update store
      useTripStore.getState().dismissAlarm();
    } catch (error) {
      console.error('Failed to dismiss alarm:', error);
    }
  }

  /**
   * Snooze alarm for specified minutes
   */
  snoozeAlarm(minutes: number = 3): void {
    useTripStore.getState().snoozeAlarm(minutes);
    
    // Stop the alarm
    this.stopHardwareAlarm().catch((error) => {
      console.error('Failed to snooze alarm:', error);
    });


  }

  /**
   * Send regular status notification (non-intrusive)
   */
  async sendStatusNotification(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: {
          seconds: 1,
        },
      });
    } catch (error) {
      console.error('Failed to send status notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  /**
   * Setup notification response listener
   */
  setupNotificationResponseListener(
    onResponse: (notification: Notifications.Notification) => void
  ): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { actionIdentifier, notification } = response;
      
      if (actionIdentifier === 'stop') {
        this.dismissAlarm();
      } else if (actionIdentifier === 'snooze') {
        this.snoozeAlarm(5);
      }
      
      onResponse(notification);
    });

    return () => subscription.remove();
  }

  /**
   * Unload alarm sound to force reloading on next play
   */
  async unloadAlarmSound(): Promise<void> {
    try {
      if (this.alarmSound) {
        const status = await this.alarmSound.getStatusAsync();
        if (status.isLoaded) {
          await this.alarmSound.unloadAsync();
        }
        this.alarmSound = null;
      }
    } catch (error) {
      console.error('Failed to unload alarm sound:', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.unloadAlarmSound();

      if (this.alarmTimeoutId) {
        clearTimeout(this.alarmTimeoutId);
        this.alarmTimeoutId = null;
      }
    } catch (error) {
      console.error('Failed to cleanup notification service:', error);
    }
  }
}

export const notificationService = new NotificationService();
