/**
 * Home Screen - Main user interface for starting trips
 */

import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '@components/Icon';
import { useTripStore } from '@store/useTripStore';
import { useLocationTracking, useLocationPermissions, useActiveTrip, useAlarm } from '@hooks/useTracking';
import { Button, Card, DistanceDisplay } from '@components/UIComponents';
import { useTheme } from '@hooks/useTheme';
import { formatDistance } from '@utils/distanceCalculator';

const HomeScreen = ({ navigation }: any) => {
  const store = useTripStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { isTracking, startTracking, stopTracking, error: trackingError } = useLocationTracking();
  const { permissions, requestForegroundPermission, allPermissionsGranted } = useLocationPermissions();
  const { activeTrip, currentLocation } = useActiveTrip();
  const { isAlarmActive, dismissAlarm, snoozeAlarm } = useAlarm();
  const [refreshing, setRefreshing] = React.useState(false);
  const [snoozeMinutes, setSnoozeMinutes] = React.useState(5);
  const [showSnoozeOptions, setShowSnoozeOptions] = React.useState(false);

  // Initialize permissions when screen loads
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        // Check if permissions already granted, if not request
        if (!allPermissionsGranted) {
          // Will prompt user if needed
        }
      })();
    }, [allPermissionsGranted])
  );

  const handleStartTrip = async () => {
    // Request permissions first
    const granted = await requestForegroundPermission();
    if (!granted) {
      store.setError({
        code: 'PERMISSION_DENIED',
        message: 'Location permission is required to use WakeWay',
        timestamp: Date.now(),
      });
      return;
    }

    // Navigate to trip setup
    navigation.navigate('TripSetup');
  };

  const handleStopTrip = async () => {
    await dismissAlarm();
    await stopTracking();
    await store.endActiveTrip();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Force location update
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/WakeWay_log.png')} style={{ width: 150, height: 150, borderRadius: 30, marginBottom: 8, marginTop: -25 }} resizeMode="contain" />
        </View>

        {/* Active Trip Section */}
        {activeTrip ? (
          <Card style={styles.activeTripCard}>
            <View style={styles.activeStatus}>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: activeTrip.alarmTriggered ? colors.danger : colors.success,
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {activeTrip.alarmTriggered ? 'ALARM TRIGGERED' : 'Tracking Active'}
              </Text>
            </View>

            <View style={styles.destinationInfo}>
              <Icon name="location-sharp" size={16} color={colors.primary} />
              <Text style={styles.destinationName}>{activeTrip.destinationName}</Text>
            </View>

            {currentLocation && (
              <DistanceDisplay
                distance={activeTrip.distanceToDestination || null}
                radius={activeTrip.radiusMeters}
              />
            )}

            <View style={styles.tripDetails}>
              <View style={styles.tripDetailItem}>
                <Text style={styles.tripDetailLabel}>Radius</Text>
                <Text style={styles.tripDetailValue}>
                  {formatDistance(activeTrip.radiusMeters)}
                </Text>
              </View>
              <View style={styles.tripDetailItem}>
                <Text style={styles.tripDetailLabel}>Duration</Text>
                <Text style={styles.tripDetailValue}>
                  {Math.round((Date.now() - activeTrip.startTime) / 60000)} min
                </Text>
              </View>
            </View>

            <View style={styles.tripActions}>
              {activeTrip.alarmTriggered ? (
                <View style={{ flex: 1, flexDirection: 'column', gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8, height: 48 }}>
                    <Button
                      title="Stop"
                      variant="primary"
                      onPress={dismissAlarm}
                      size="small"
                      style={{ flex: 1, height: 48 }}
                    />
                    <View style={{ flex: 1.2, flexDirection: 'row', height: 48 }}>
                      <Button
                        title={`Snooze (${snoozeMinutes}m)`}
                        variant="warning"
                        onPress={() => snoozeAlarm(snoozeMinutes)}
                        size="small"
                        style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, height: 48, paddingHorizontal: 4 }}
                      />
                      <TouchableOpacity
                        style={[styles.dropdownBtn, { height: 48, backgroundColor: '#D97706' }]}
                        onPress={() => setShowSnoozeOptions(true)}
                      >
                        <Icon name="chevron-down" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Button
                    title="End Trip"
                    variant="danger"
                    onPress={handleStopTrip}
                    size="small"
                    style={{ height: 48 }}
                  />
                </View>
              ) : (
                <>
                  <Button
                    title="View Map"
                    variant="outline"
                    onPress={() => navigation.navigate('Map')}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="End Trip"
                    variant="danger"
                    onPress={handleStopTrip}
                    style={{ flex: 1 }}
                  />
                </>
              )}
            </View>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Icon
              name="sleep"
              size={48}
              color={colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No Active Trip</Text>
            <Text style={styles.emptyDescription}>
              Start tracking to get alerted when you're near your destination
            </Text>
            <Button
              title="Start New Trip"
              onPress={handleStartTrip}
              style={styles.startButton}
            />
          </Card>
        )}

        {/* Quick Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{store.tripHistory.length}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {store.tripHistory.filter((t: any) => t.alarmTriggered).length}
              </Text>
              <Text style={styles.statLabel}>Alarms Used</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {store.settings.soundEnabled ? 'On' : 'Off'}
              </Text>
              <Text style={styles.statLabel}>Sound</Text>
            </View>
          </View>
        </Card>

        {/* Error Message */}
        {(store.error || trackingError) && (
          <Card style={[styles.errorCard, { backgroundColor: colors.danger }] as any}>
            <Text style={styles.errorText}>
              {store.error?.message || trackingError}
            </Text>
          </Card>
        )}

        {/* Info Section */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.infoItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} style={styles.infoBulletIcon as any} />
            <Text style={styles.infoText}>Select your destination on a map</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} style={styles.infoBulletIcon as any} />
            <Text style={styles.infoText}>Set your alert radius (100m - 2km)</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} style={styles.infoBulletIcon as any} />
            <Text style={styles.infoText}>Get notified when you're close</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Snooze Options Modal */}
      <Modal visible={showSnoozeOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSnoozeOptions(false)} activeOpacity={1}>
          <View style={styles.dropdownMenu}>
            {[5, 10, 15, 30, 45, 60].map(mins => (
              <TouchableOpacity
                key={mins}
                style={styles.dropdownItem}
                onPress={() => {
                  setSnoozeMinutes(mins);
                  setShowSnoozeOptions(false);
                }}
              >
                <Text style={styles.dropdownText}>{mins} minutes</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 64,
  },
  activeTripCard: {
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tripDetailItem: {
    alignItems: 'center',
  },
  tripDetailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tripDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tripActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    width: '100%',
  },
  statsCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  errorCard: {
    marginBottom: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    marginBottom: 24,
    backgroundColor: colors.surface === '#FFFFFF' ? '#F0F9FF' : colors.surface,
    borderColor: colors.surface === '#FFFFFF' ? '#E0F2FE' : colors.border,
    borderWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  infoBulletIcon: {
    marginRight: 10,
    marginTop: 0,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  dropdownBtn: {
    backgroundColor: colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.3)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
});

export default HomeScreen;
