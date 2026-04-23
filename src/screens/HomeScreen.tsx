/**
 * Home Screen — Premium edition with proximity ring, live timer, animated stats
 */

import React, { useEffect, useRef, useState } from 'react';
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
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '@components/Icon';
import { useTripStore } from '@store/useTripStore';
import { useLocationTracking, useLocationPermissions, useActiveTrip, useAlarm } from '@hooks/useTracking';
import { Button, Card, DistanceDisplay, Badge } from '@components/UIComponents';
import ProximityRing from '@components/ProximityRing';
import AnimatedNumber from '@components/AnimatedNumber';
import { useTheme } from '@hooks/useTheme';
import { formatDistance } from '@utils/distanceCalculator';
import { GRADIENTS, SHADOWS, RADIUS, SPACING } from '@/constants/theme';
import { useAuthStore } from '@store/useAuthStore';

// ─── Greeting helper ──────────────────────────────────────────────────────────

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getGreetingEmoji = () => {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 17) return '🌤️';
  return '🌙';
};

const getUserName = (email?: string) => {
  if (!email) return 'Traveler';
  const local = email.split('@')[0];
  const parts = local.split(/[._-]/);
  const name = parts[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// ─── Live Timer ───────────────────────────────────────────────────────────────

const useLiveTimer = (startTime: number | null) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const update = () => setElapsed(Date.now() - startTime);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return elapsed;
};

const formatElapsed = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
};

// ─── Pulsing Dot ──────────────────────────────────────────────────────────────

const PulsingDot: React.FC<{ color: string }> = ({ color }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color + '30', transform: [{ scale: pulse }], position: 'absolute' }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const HomeScreen = ({ navigation }: any) => {
  const store = useTripStore();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const userEmail = useAuthStore(s => s.user?.email);

  const { isTracking, startTracking, stopTracking, error: trackingError } = useLocationTracking();
  const { permissions, requestForegroundPermission, allPermissionsGranted } = useLocationPermissions();
  const { activeTrip, currentLocation } = useActiveTrip();
  const { isAlarmActive, dismissAlarm, snoozeAlarm } = useAlarm();

  const [refreshing, setRefreshing] = useState(false);
  const [snoozeMinutes, setSnoozeMinutes] = useState(5);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  // Live duration timer
  const elapsed = useLiveTimer(activeTrip?.startTime ?? null);

  // Proximity progress (0 = at destination, 1 = far away)
  const getProximityProgress = () => {
    if (!activeTrip || activeTrip.distanceToDestination === null || activeTrip.distanceToDestination === undefined) return 1;
    const referenceDistance = Math.max(activeTrip.radiusMeters * 5, 500);
    return Math.min(activeTrip.distanceToDestination / referenceDistance, 1);
  };

  // Card entrance animation
  const cardAnim = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    React.useCallback(() => {
      cardAnim.setValue(0);
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 6,
        speed: 12,
      }).start();
    }, [])
  );

  const handleStartTrip = async () => {
    const granted = await requestForegroundPermission();
    if (!granted) {
      store.setError({ code: 'PERMISSION_DENIED', message: 'Location permission is required to use WakeWay', timestamp: Date.now() });
      return;
    }
    navigation.navigate('TripSetup');
  };

  const handleStopTrip = async () => {
    await dismissAlarm();
    await stopTracking();
    await store.endActiveTrip();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const totalTrips = store.tripHistory.length;
  const alarmsUsed = store.tripHistory.filter((t: any) => t.alarmTriggered).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* ── Hero Header ─────────────────────────────── */}
        <LinearGradient
          colors={isDark ? GRADIENTS.heroDark : GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greetingEmoji}>{getGreetingEmoji()}</Text>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.greetingName}>{getUserName(userEmail)}</Text>
            </View>
            <Image
              source={require('../../assets/WakeWay_log.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroTagline}>
            {activeTrip ? '🟢 Trip in progress — we\'ll wake you up' : '✈️ Never miss your stop again'}
          </Text>
        </LinearGradient>

        {/* ── Active Trip Card ─────────────────────────── */}
        <Animated.View style={{ opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          {activeTrip ? (
            <Card variant="gradient-border" gradientBorderColor={activeTrip.alarmTriggered ? colors.danger : colors.primary} style={styles.activeTripCard}>
              {/* Status row */}
              <View style={styles.activeStatus}>
                <PulsingDot color={activeTrip.alarmTriggered ? colors.danger : colors.success} />
                <Text style={[styles.statusText, { color: activeTrip.alarmTriggered ? colors.danger : colors.success }]}>
                  {activeTrip.alarmTriggered ? 'ALARM TRIGGERED' : 'TRACKING ACTIVE'}
                </Text>
                <Badge
                  text={activeTrip.alarmTriggered ? '🔔 Alert' : '📡 Live'}
                  variant={activeTrip.alarmTriggered ? 'danger' : 'primary'}
                  size="sm"
                />
              </View>

              {/* Destination name */}
              <View style={styles.destinationRow}>
                <Icon name="location" size={18} color={colors.primary} />
                <Text style={styles.destinationName} numberOfLines={1}>{activeTrip.destinationName}</Text>
              </View>

              {/* Proximity Ring + Distance */}
              <View style={styles.proximitySection}>
                <ProximityRing progress={getProximityProgress()} size={160} strokeWidth={12}>
                  <View style={styles.ringCenter}>
                    <Text style={[styles.ringDistance, { color: colors.text }]}>
                      {activeTrip.distanceToDestination !== null && activeTrip.distanceToDestination !== undefined
                        ? activeTrip.distanceToDestination >= 1000
                          ? `${(activeTrip.distanceToDestination / 1000).toFixed(1)}`
                          : `${Math.round(activeTrip.distanceToDestination)}`
                        : '—'}
                    </Text>
                    <Text style={[styles.ringUnit, { color: colors.textSecondary }]}>
                      {activeTrip.distanceToDestination !== null && activeTrip.distanceToDestination !== undefined && activeTrip.distanceToDestination >= 1000 ? 'km away' : 'm away'}
                    </Text>
                  </View>
                </ProximityRing>
              </View>

              {/* Trip stats */}
              <View style={[styles.tripStats, { borderColor: colors.border }]}>
                <View style={styles.statPill}>
                  <Icon name="scan-circle-outline" size={14} color={colors.primary} />
                  <Text style={[styles.statPillLabel, { color: colors.textSecondary }]}>Radius</Text>
                  <Text style={[styles.statPillValue, { color: colors.text }]}>{formatDistance(activeTrip.radiusMeters)}</Text>
                </View>
                <View style={[styles.statPillDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statPill}>
                  <Icon name="time-outline" size={14} color={colors.accent} />
                  <Text style={[styles.statPillLabel, { color: colors.textSecondary }]}>Duration</Text>
                  <Text style={[styles.statPillValue, { color: colors.text }]}>{formatElapsed(elapsed)}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.tripActions}>
                {activeTrip.alarmTriggered ? (
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button title="Dismiss" variant="success" onPress={dismissAlarm} size="small" style={{ flex: 1 }} />
                      <View style={{ flex: 1.2, flexDirection: 'row' }}>
                        <Button
                          title={`Snooze ${snoozeMinutes}m`}
                          variant="warning"
                          onPress={() => snoozeAlarm(snoozeMinutes)}
                          size="small"
                          style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        />
                        <TouchableOpacity
                          style={[styles.dropdownBtn, { backgroundColor: colors.warningDark || '#D97706' }]}
                          onPress={() => setShowSnoozeOptions(true)}
                        >
                          <Icon name="chevron-down" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Button title="End Trip" variant="danger" onPress={handleStopTrip} size="small" />
                  </View>
                ) : (
                  <>
                    <Button title="View Map" variant="outline" onPress={() => navigation.navigate('Map')} style={{ flex: 1, marginRight: 8 }} icon={<Icon name="map-outline" size={16} color={colors.primary} />} />
                    <Button title="End Trip" variant="danger" onPress={handleStopTrip} style={{ flex: 1 }} />
                  </>
                )}
              </View>
            </Card>
          ) : (
            /* ── Empty State ──────────────────────────────── */
            <Card style={styles.emptyCard}>
              <LinearGradient colors={isDark ? ['#1F2937', '#111827'] : ['#EFF6FF', '#F0F9FF']} style={styles.emptyGradient}>
                <View style={styles.emptyIconWrap}>
                  <LinearGradient colors={GRADIENTS.primaryVibrant} style={styles.emptyIconBg}>
                    <Icon name="navigate" size={36} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyTitle}>Ready to travel?</Text>
                <Text style={styles.emptyDescription}>
                  Set your destination and WakeWay will alert you when you're almost there — even if you fall asleep.
                </Text>
                <Button
                  title="Start New Trip"
                  onPress={handleStartTrip}
                  style={styles.startButton}
                  size="large"
                  icon={<Icon name="rocket-outline" size={18} color="#FFFFFF" />}
                />
                {/* Feature pills */}
                <View style={styles.featurePills}>
                  {['📍 Smart Tracking', '🔔 Wake Alarm', '📊 Trip History'].map(f => (
                    <View key={f} style={[styles.featurePill, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
                      <Text style={[styles.featurePillText, { color: colors.primary }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </Card>
          )}
        </Animated.View>

        {/* ── Quick Stats ──────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total Trips', value: totalTrips, icon: 'airplane-outline', color: colors.primary, bg: colors.primary + '12' },
            { label: 'Alarms Used', value: alarmsUsed, icon: 'alarm-outline', color: colors.accent, bg: colors.accent + '12' },
            { label: 'Sound', value: store.settings.soundEnabled ? 1 : 0, icon: store.settings.soundEnabled ? 'volume-high-outline' : 'volume-mute-outline', color: colors.success, bg: colors.success + '12', displayText: store.settings.soundEnabled ? 'On' : 'Off' },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.bg, borderColor: stat.color + '25' }]}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.color + '20' }]}>
                <Icon name={stat.icon} size={16} color={stat.color} />
              </View>
              {stat.displayText ? (
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.displayText}</Text>
              ) : (
                <AnimatedNumber value={stat.value} style={[styles.statValue, { color: stat.color }]} />
              )}
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Error ───────────────────────────────────── */}
        {(store.error || trackingError) && (
          <Card style={[styles.errorCard, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="warning-outline" size={18} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{store.error?.message || trackingError}</Text>
            </View>
          </Card>
        )}

        {/* ── How It Works ─────────────────────────────── */}
        <Card style={styles.howCard}>
          <Text style={[styles.howTitle, { color: colors.text }]}>How It Works</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.howScroll} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
            {[
              { step: '1', icon: 'map-outline', title: 'Pick Destination', desc: 'Tap the map to set where you\'re going', color: colors.primary },
              { step: '2', icon: 'scan-circle-outline', title: 'Set Radius', desc: 'Choose how close before you\'re woken up', color: colors.accent },
              { step: '3', icon: 'notifications-outline', title: 'Relax & Sleep', desc: 'WakeWay watches your location for you', color: colors.success },
            ].map(item => (
              <View key={item.step} style={[styles.howStep, { backgroundColor: item.color + '10', borderColor: item.color + '25' }]}>
                <View style={[styles.howStepIcon, { backgroundColor: item.color }]}>
                  <Icon name={item.icon} size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.howStepTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.howStepDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </Card>
      </ScrollView>

      {/* Snooze Modal */}
      <Modal visible={showSnoozeOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSnoozeOptions(false)} activeOpacity={1}>
          <View style={[styles.snoozeMenu, { backgroundColor: colors.surface }]}>
            <Text style={[styles.snoozeMenuTitle, { color: colors.text }]}>Snooze Duration</Text>
            {[5, 10, 15, 30, 45, 60].map(mins => (
              <TouchableOpacity
                key={mins}
                style={[styles.snoozeMenuItem, { borderBottomColor: colors.border }]}
                onPress={() => { setSnoozeMinutes(mins); setShowSnoozeOptions(false); }}
              >
                <Icon name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.snoozeMenuText, { color: colors.text }]}>{mins} minutes</Text>
                {snoozeMinutes === mins && <Icon name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // Hero
  heroGradient: {
    margin: 16,
    marginBottom: 12,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.lg,
    ...SHADOWS.elevated,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greetingEmoji: { fontSize: 24, marginBottom: 2 },
  greetingText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  greetingName: { fontSize: 24, color: '#FFFFFF', fontWeight: '800', letterSpacing: -0.5 },
  heroLogo: { width: 64, height: 64, borderRadius: 16 },
  heroTagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginTop: 4 },

  // Active trip
  activeTripCard: { marginHorizontal: 16, marginBottom: 12 },
  activeStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  destinationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  destinationName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },

  // Proximity ring section
  proximitySection: { alignItems: 'center', marginBottom: 16 },
  ringCenter: { alignItems: 'center' },
  ringDistance: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  ringUnit: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Trip stats
  tripStats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, marginBottom: 16 },
  statPill: { flex: 1, alignItems: 'center', gap: 3 },
  statPillLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  statPillValue: { fontSize: 15, fontWeight: '700' },
  statPillDivider: { width: 1, marginVertical: 4 },

  // Actions
  tripActions: { flexDirection: 'row', gap: 8 },
  dropdownBtn: {
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10,
    borderTopRightRadius: RADIUS.sm, borderBottomRightRadius: RADIUS.sm,
    borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.3)',
  },

  // Empty state
  emptyCard: { marginHorizontal: 16, marginBottom: 12, padding: 0, overflow: 'hidden' },
  emptyGradient: { padding: SPACING.xl, alignItems: 'center', borderRadius: RADIUS.lg },
  emptyIconWrap: { marginBottom: 16 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', ...SHADOWS.primary },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptyDescription: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 8 },
  startButton: { width: '100%', marginBottom: 16 },
  featurePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  featurePill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: RADIUS.pill, borderWidth: 1 },
  featurePillText: { fontSize: 11, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 10 },
  statCard: { flex: 1, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, ...SHADOWS.subtle },
  statIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  // Error
  errorCard: { marginHorizontal: 16, marginBottom: 12, paddingVertical: 12 },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // How it works
  howCard: { marginHorizontal: 16, marginBottom: 12 },
  howTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3, marginBottom: 14 },
  howScroll: { marginHorizontal: -4 },
  howStep: { width: 140, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1, gap: 8 },
  howStepIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  howStepTitle: { fontSize: 13, fontWeight: '700' },
  howStepDesc: { fontSize: 11, lineHeight: 15 },

  // Snooze modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  snoozeMenu: { borderRadius: RADIUS.xl, width: 240, overflow: 'hidden', ...SHADOWS.elevated },
  snoozeMenuTitle: { fontSize: 14, fontWeight: '700', padding: 16, paddingBottom: 8, textAlign: 'center' },
  snoozeMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1 },
  snoozeMenuText: { flex: 1, fontSize: 15, fontWeight: '500' },
});

export default HomeScreen;
