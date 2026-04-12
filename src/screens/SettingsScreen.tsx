/**
 * Settings Screen - User preferences and app configuration
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  Switch,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { notificationService } from '@services/notificationService';
import Icon from '@components/Icon';
import { useTripStore } from '@store/useTripStore';
import { useLocationPermissions } from '@hooks/useTracking';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/useAuthStore';
import { Card, Button, COLORS as DEFAULT_COLORS } from '@components/UIComponents';
import { DEFAULT_RADIUS_METERS, RADIUS_OPTIONS } from '@/constants';
import { useAlert } from '../providers/AlertProvider';

const SettingsScreen = () => {
  const store = useTripStore();
  const { isDark, colors, themeMode, setDarkMode } = useTheme();
  const { showAlert } = useAlert();
  const styles = getStyles(colors);

  const { permissions, requestForegroundPermission, requestBackgroundPermission } =
    useLocationPermissions();

  const handleToggleSetting = (key: keyof typeof store.settings, value: boolean) => {
    store.updateSettings({ [key]: value });
  };

  const handleDefaultRadiusChange = (radius: number) => {
    store.updateSettings({ defaultRadius: radius });
  };

  const handleClearHistory = () => {
    showAlert({
      title: 'Clear History',
      message: 'Are you sure you want to delete all trip history?',
      showCancelButton: true,
      confirmText: 'Clear',
      confirmButtonColor: colors.danger,
      onConfirm: () => {
        store.clearTripHistory();
        setTimeout(() => {
          showAlert({ title: 'Success', message: 'Trip history cleared' });
        }, 500);
      }
    });
  };

  const handleLogout = () => {
    showAlert({
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      showCancelButton: true,
      confirmText: 'Log Out',
      confirmButtonColor: colors.danger,
      onConfirm: () => {
        useAuthStore.getState().logout();
      }
    });
  };

  const handlePermissionRequest = async (type: 'foreground' | 'background') => {
    if (type === 'foreground') {
      const granted = await requestForegroundPermission();
      showAlert({
        title: 'Permission',
        message: granted ? 'Foreground location permission granted' : 'Permission request was denied',
      });
    } else {
      const granted = await requestBackgroundPermission();
      showAlert({
        title: 'Permission',
        message: granted ? 'Background location permission granted' : 'Permission request was denied',
      });
    }
  };

  const handlePickCustomSound = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newUri = FileSystem.documentDirectory + 'custom_alarm_' + Date.now() + '.mp3';
        
        await FileSystem.copyAsync({
          from: asset.uri,
          to: newUri
        });
        
        store.updateSettings({ 
          customAlarmSoundUri: newUri,
          customAlarmSoundName: asset.name
        });
        
        await notificationService.unloadAlarmSound();
        showAlert({ title: 'Success', message: 'Custom alarm sound set successfully.' });
      }
    } catch (err) {
      console.error('Failed to pick custom sound:', err);
      showAlert({ title: 'Error', message: 'Could not pick audio file.' });
    }
  };

  const clearCustomSound = async () => {
     store.updateSettings({ 
       customAlarmSoundUri: null,
       customAlarmSoundName: null
     });
     await notificationService.unloadAlarmSound();
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Alarm Preferences */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Alarm Preferences</Text>

          <SettingRow
            label="Sound"
            description="Play alarm sound"
            value={store.settings.soundEnabled}
            onChange={(value) => handleToggleSetting('soundEnabled', value)}
          />

          <SettingRow
            label="Vibration"
            description="Vibrate on alarm"
            value={store.settings.vibrationEnabled}
            onChange={(value) => handleToggleSetting('vibrationEnabled', value)}
          />

          <SettingRow
            label="Snooze"
            description="Enable snooze option"
            value={store.settings.snoozeEnabled}
            onChange={(value) => handleToggleSetting('snoozeEnabled', value)}
          />

          <View style={[styles.settingItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.settingLabel}>Custom Alarm Sound</Text>
              <Text style={styles.settingDescription}>
                {store.settings.customAlarmSoundName || 'Default Sound'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Choose File" size="small" onPress={handlePickCustomSound} variant="primary" />
              {store.settings.customAlarmSoundUri && (
                <Button title="Reset Default" size="small" onPress={clearCustomSound} variant="outline" />
              )}
            </View>
          </View>
        </Card>

        {/* Default Settings */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Default Settings</Text>

          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Default Radius</Text>
              <Text style={styles.settingDescription}>Default alert distance for new trips</Text>
            </View>
          </View>

          <View style={styles.radiusGrid}>
            {RADIUS_OPTIONS.map((radius: number) => (
              <TouchableOpacity
                key={radius}
                style={[
                  styles.radiusOption,
                  store.settings.defaultRadius === radius && styles.radiusOptionActive,
                ]}
                onPress={() => handleDefaultRadiusChange(radius)}
              >
                <Text
                  style={[
                    styles.radiusOptionText,
                    store.settings.defaultRadius === radius &&
                      styles.radiusOptionTextActive,
                  ]}
                >
                  {radius}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Permissions */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Permissions</Text>

          <PermissionRow
            icon="location"
            label="Foreground Location"
            status={permissions.location}
            onRequest={() => handlePermissionRequest('foreground')}
          />

          <PermissionRow
            icon="location"
            label="Background Location"
            status={permissions.locationBackground}
            onRequest={() => handlePermissionRequest('background')}
          />

          <PermissionRow
            icon="notifications"
            label="Notifications"
            status={permissions.notifications}
            onRequest={() => {}}
          />
        </Card>

        {/* Display */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🌙 Theme Mode</Text>
          <View style={styles.radiusGrid}>
            {['system', 'light', 'dark'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.radiusOption,
                  themeMode === mode && styles.radiusOptionActive,
                ]}
                onPress={() => setDarkMode(mode as any)}
              >
                <Text
                  style={[
                    styles.radiusOptionText,
                    themeMode === mode && styles.radiusOptionTextActive,
                  ]}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Data & Privacy */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Data & Privacy</Text>

          <TouchableOpacity style={styles.actionItem} onPress={handleClearHistory}>
            <View>
              <Text style={styles.actionLabel}>Clear Trip History</Text>
              <Text style={styles.actionDescription}>Delete all recorded trips</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Account Details */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Account</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Currently logged in</Text>
            <Text style={styles.infoValue}>{useAuthStore.getState().user?.email || 'N/A'}</Text>
          </View>
          
          <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <View>
              <Text style={[styles.actionLabel, { color: colors.danger }]}>Log Out</Text>
              <Text style={styles.actionDescription}>End your current session</Text>
            </View>
            <Icon name="log-out-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </Card>

        {/* App Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Developer</Text>
            <Text style={styles.infoValue}>WakeWay Team</Text>
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>WakeWay - Never miss your stop ✈️</Text>
          <Text style={styles.footerVersion}>v1.0.0 • Built with React Native</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Setting Row Component
 */
const SettingRow = ({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  return (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={value ? colors.primary : colors.textSecondary}
      />
    </View>
  );
};

/**
 * Permission Row Component
 */
const PermissionRow = ({
  icon,
  label,
  status,
  onRequest,
}: {
  icon: string;
  label: string;
  status: string;
  onRequest: () => void;
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const isGranted = status === 'granted';
  const statusColor = isGranted ? colors.success : colors.danger;
  const statusText = isGranted ? 'Granted' : 'Denied';
  const { showAlert } = useAlert();

  return (
    <View style={styles.permissionItem}>
      <View style={styles.permissionLeft}>
        <Icon name={icon} size={20} color={colors.primary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={[styles.settingDescription, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>
      {!isGranted ? (
        <Button
          title="Request"
          size="small"
          onPress={onRequest}
          variant="primary"
        />
      ) : (
        <Button
          title="Remove"
          size="small"
          onPress={() => {
            showAlert({
              title: 'Revoke Permission',
              message: 'To safely remove permissions, we will route you to your device Settings. Please toggle off the permission there.',
              showCancelButton: true,
              confirmText: 'Open Settings',
              confirmButtonColor: colors.danger,
              onConfirm: () => Linking.openSettings()
            });
          }}
          variant="danger"
        />
      )}
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scroll: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  radiusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  radiusOption: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  radiusOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  radiusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  radiusOptionTextActive: {
    color: colors.primary,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  footerVersion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default SettingsScreen;
