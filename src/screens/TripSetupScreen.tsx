/**
 * Trip Setup Screen - Configure alarm radius and start tracking
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
  Switch,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTripStore } from '@store/useTripStore';
import { useLocationTracking, useActiveTrip } from '@hooks/useTracking';
import { locationService } from '@services/locationService';
import { Button, Card, LoadingSpinner } from '@components/UIComponents';
import { useTheme } from '@hooks/useTheme';
import { RADIUS_OPTIONS, DEFAULT_RADIUS_METERS } from '@/constants';
import { formatDistance } from '@utils/distanceCalculator';
import { PermissionStatus } from '@/types';
import { useAlert } from '../providers/AlertProvider';

const TripSetupScreen = ({ navigation, route }: any) => {
  const store = useTripStore();
  const { startTracking, isTracking } = useLocationTracking();
  const { createTrip } = useActiveTrip();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const styles = getStyles(colors);

  // Get destination from route params (set by map screen)
  const destination = route?.params?.destination || null;
  const [selectedRadius, setSelectedRadius] = useState(DEFAULT_RADIUS_METERS);
  const [destinationName, setDestinationName] = useState(
    route?.params?.destinationName || 'My Destination'
  );
  const [useVibration, setUseVibration] = useState(store.settings.vibrationEnabled);
  const [useSound, setUseSound] = useState(store.settings.soundEnabled);
  const [loading, setLoading] = useState(false);

  if (!destination) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>No Destination Selected</Text>
          <Button
            title="Select Destination"
            onPress={() => navigation.navigate('Map')}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleStartTracking = async () => {
    try {
      setLoading(true);

      // Check and request location permissions first
      const permissions = await locationService.checkPermissions();
      
      if (permissions.location !== PermissionStatus.GRANTED) {
        const grantedStatus = await locationService.requestForegroundPermission();
        if (grantedStatus !== PermissionStatus.GRANTED) {
          showAlert({
            title: 'Permission Denied',
            message: 'Location permission is required to use WakeWay. Please enable it in settings.'
          });
          setLoading(false);
          return;
        }
      }

      // Update settings
      store.updateSettings({ vibrationEnabled: useVibration, soundEnabled: useSound });

      // Create trip
      createTrip(destination, selectedRadius, destinationName);

      // Start location tracking
      await startTracking();

      setLoading(false);
      navigation.navigate('HomeTab');
    } catch (error) {
      setLoading(false);
      console.error('Error starting trip:', error);
      showAlert({
        title: 'Error', 
        message: 'Failed to start trip. Please try again.'
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        {/* Destination Card */}
        <Card style={styles.destinationCard}>
          <Text style={styles.sectionLabel}>📍 Trip Name</Text>
          <TextInput
            style={styles.destinationInput}
            value={destinationName}
            onChangeText={setDestinationName}
            placeholder="Name your trip..."
            placeholderTextColor={colors.textSecondary}
          />
          <Button
            title="Change Location"
            variant="outline"
            size="small"
            onPress={() => navigation.navigate('Map')}
            style={styles.changeButton}
          />
        </Card>

        {/* Radius Selection */}
        <Card>
          <Text style={styles.sectionLabel}>📏 Alert Radius</Text>
          <Text style={styles.radiusValue}>{formatDistance(selectedRadius)}</Text>
          <Text style={styles.radiusDescription}>
            Alarm will trigger when within this distance of your destination
          </Text>

          <Slider
            style={styles.slider}
            minimumValue={50}
            maximumValue={5000}
            step={50}
            value={selectedRadius}
            onValueChange={setSelectedRadius}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent || colors.primary}
          />

          <View style={styles.radiusPresets}>
            {RADIUS_OPTIONS.map((radius: number) => (
              <Button
                key={radius}
                title={formatDistance(radius)}
                variant={selectedRadius === radius ? 'primary' : 'outline'}
                size="small"
                onPress={() => setSelectedRadius(radius)}
                style={styles.presetButton}
              />
            ))}
          </View>
        </Card>

        {/* Alarm Settings */}
        <Card>
          <Text style={styles.sectionLabel}>🔔 Alarm Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingTitle}>Sound</Text>
              <Text style={styles.settingDescription}>Play alarm sound</Text>
            </View>
            <Switch
              value={useSound}
              onValueChange={setUseSound}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={useSound ? colors.primary : colors.textSecondary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingTitle}>Vibration</Text>
              <Text style={styles.settingDescription}>Vibrate when alarm triggers</Text>
            </View>
            <Switch
              value={useVibration}
              onValueChange={setUseVibration}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={useVibration ? colors.primary : colors.textSecondary}
            />
          </View>
        </Card>

        {/* Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>⚡ Tips</Text>
          <Text style={styles.infoText}>
            • Set a smaller radius for more precise alerts{'\n'}
            • Keep this app in the background while traveling{'\n'}
            • Ensure location services are enabled{'\n'}
            • Battery usage will increase with tracking enabled
          </Text>
        </Card>

        {/* Start Button */}
        <Button
          title={loading ? 'Starting Trip...' : 'Start Trip'}
          onPress={handleStartTracking}
          loading={loading}
          style={styles.startButton}
          size="large"
        />
      </ScrollView>
    </SafeAreaView>
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
    padding: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  button: {
    minWidth: 200,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  destinationCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  destinationInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
    paddingTop: 8,
  },
  changeButton: {
    marginTop: 12,
  },
  radiusValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginVertical: 12,
  },
  radiusDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 16,
  },
  radiusPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  presetButton: {
    width: '31%',
    minWidth: 0,
    paddingHorizontal: 0,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  infoCard: {
    marginBottom: 32,
    marginTop: 12,
    backgroundColor: colors.surface === '#FFFFFF' ? '#F0F9FF' : colors.surface,
    borderColor: colors.surface === '#FFFFFF' ? '#E0F2FE' : colors.border,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  startButton: {
    marginBottom: 32,
  },
});

export default TripSetupScreen;
