/**
 * Trip Setup Screen — Step indicator, radius visualizer, sticky CTA
 */

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Text, SafeAreaView, ScrollView,
  Switch, Platform, StatusBar, TextInput, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { useTripStore } from '@store/useTripStore';
import { useLocationTracking, useActiveTrip } from '@hooks/useTracking';
import { locationService } from '@services/locationService';
import { Button, Card } from '@components/UIComponents';
import { useTheme } from '@hooks/useTheme';
import { RADIUS_OPTIONS, DEFAULT_RADIUS_METERS } from '@/constants';
import { formatDistance } from '@utils/distanceCalculator';
import { PermissionStatus } from '@/types';
import { useAlert } from '../providers/AlertProvider';
import Icon from '@components/Icon';
import { GRADIENTS, SHADOWS, RADIUS as R, SPACING } from '@/constants/theme';

// ─── Step Indicator ───────────────────────────────────────────────────────────

const StepIndicator: React.FC<{ currentStep: number; colors: any }> = ({ currentStep, colors }) => {
  const steps = ['Location', 'Radius', 'Alarm'];
  return (
    <View style={stepStyles.container}>
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <React.Fragment key={label}>
            <View style={stepStyles.stepItem}>
              <View style={[stepStyles.circle, {
                backgroundColor: done ? colors.success : active ? colors.primary : colors.border,
                borderColor: done ? colors.success : active ? colors.primary : colors.border,
              }]}>
                {done
                  ? <Icon name="checkmark" size={12} color="#FFF" />
                  : <Text style={[stepStyles.circleNum, { color: active ? '#FFF' : colors.textSecondary }]}>{i + 1}</Text>
                }
              </View>
              <Text style={[stepStyles.label, { color: active ? colors.primary : done ? colors.success : colors.textSecondary }]}>{label}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[stepStyles.line, { backgroundColor: done ? colors.success : colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const stepStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  stepItem: { alignItems: 'center', gap: 4 },
  circle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  circleNum: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  line: { flex: 1, height: 2, marginHorizontal: 4, marginBottom: 16 },
});

// ─── Radius Visualizer ────────────────────────────────────────────────────────

const RadiusVisualizer: React.FC<{ radius: number; colors: any }> = ({ radius, colors }) => {
  const maxRadius = 5000;
  const pct = radius / maxRadius;
  const circleSize = 40 + pct * 120;
  const color = radius <= 500 ? colors.success : radius <= 1500 ? colors.warning : colors.danger;

  return (
    <View style={vizStyles.container}>
      {/* Outer circle */}
      <View style={[vizStyles.outerCircle, { width: circleSize + 40, height: circleSize + 40, borderRadius: (circleSize + 40) / 2, backgroundColor: color + '10', borderColor: color + '25' }]}>
        {/* Inner circle (destination area) */}
        <View style={[vizStyles.innerCircle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: color + '20', borderColor: color + '50' }]}>
          {/* Center dot (you) */}
          <View style={[vizStyles.centerDot, { backgroundColor: color }]} />
        </View>
      </View>
      <Text style={[vizStyles.label, { color: colors.textSecondary }]}>
        {radius <= 500 ? '✓ Precise' : radius <= 1500 ? '⚠ Moderate' : '⚠ Wide area'}
      </Text>
    </View>
  );
};

const vizStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  outerCircle: { justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  innerCircle: { justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  centerDot: { width: 10, height: 10, borderRadius: 5 },
  label: { marginTop: 10, fontSize: 12, fontWeight: '600' },
});

// ─── Main ─────────────────────────────────────────────────────────────────────

const TripSetupScreen = ({ navigation, route }: any) => {
  const store = useTripStore();
  const { startTracking } = useLocationTracking();
  const { createTrip } = useActiveTrip();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [selectedRadius, setSelectedRadius] = useState(DEFAULT_RADIUS_METERS);
  const [useVibration, setUseVibration] = useState(store.settings.vibrationEnabled);
  const [useSound, setUseSound] = useState(store.settings.soundEnabled);
  const [loading, setLoading] = useState(false);

  // Append new waypoint when returning from MapScreen
  useEffect(() => {
    if (route?.params?.destination) {
      const newLoc = route.params.destination;
      const newName = route.params.destinationName || 'New Waypoint';
      // Prevent duplicates
      setWaypoints(prev => {
        if (prev.some(wp => wp.location.latitude === newLoc.latitude && wp.location.longitude === newLoc.longitude)) {
          return prev;
        }
        return [...prev, { location: newLoc, name: newName }];
      });
    }
  }, [route?.params?.destination]);

  const currentStep = waypoints.length > 0 ? (selectedRadius !== DEFAULT_RADIUS_METERS ? 2 : 1) : 0;

  if (waypoints.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <LinearGradient colors={isDark ? GRADIENTS.heroDark : GRADIENTS.hero} style={styles.noDestGradient}>
          <View style={[styles.noDestIconBg]}>
            <Icon name="map-outline" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.noDestTitle}>No Destinations</Text>
          <Text style={styles.noDestDesc}>Pick a location on the map first</Text>
          <Button
            title="Open Map"
            onPress={() => navigation.navigate('Map')}
            style={{ marginTop: 24, minWidth: 180 }}
            icon={<Icon name="navigate-outline" size={18} color="#FFF" />}
          />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const handleStartTracking = async () => {
    try {
      setLoading(true);
      const permissions = await locationService.checkPermissions();
      if (permissions.location !== PermissionStatus.GRANTED) {
        const granted = await locationService.requestForegroundPermission();
        if (granted !== PermissionStatus.GRANTED) {
          showAlert({ title: 'Permission Denied', message: 'Location permission is required.' });
          setLoading(false);
          return;
        }
      }
      store.updateSettings({ vibrationEnabled: useVibration, soundEnabled: useSound });
      const finalWaypoints = waypoints.map((wp: any) => ({
        location: wp.location,
        name: wp.name,
        radiusMeters: selectedRadius,
      }));
      createTrip(finalWaypoints);
      await startTracking();
      setLoading(false);
      navigation.navigate('HomeTab');
    } catch {
      setLoading(false);
      showAlert({ title: 'Error', message: 'Failed to start trip. Please try again.' });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      {/* Header */}
      <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>New Trip</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} colors={colors} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Waypoints Card */}
        <Card variant="gradient-border" gradientBorderColor={colors.primary} style={styles.card}>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '18' }]}>
              <Icon name="location" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Trip Route</Text>
          </View>
          
          {waypoints.map((wp, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: index < waypoints.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                 <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{index + 1}</Text>
              </View>
              <TextInput
                style={[styles.nameInput, { color: colors.text, flex: 1, borderBottomWidth: 0, paddingVertical: 0 }]}
                value={wp.name}
                onChangeText={(text) => {
                  setWaypoints(prev => {
                    const newArr = [...prev];
                    newArr[index].name = text;
                    return newArr;
                  });
                }}
                placeholder={`Waypoint ${index + 1}`}
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity onPress={() => setWaypoints(prev => prev.filter((_, i) => i !== index))} style={{ padding: 4 }}>
                <Icon name="close-circle-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <Button
            title="Add Another Stop"
            variant="outline"
            size="small"
            onPress={() => navigation.navigate('Map')}
            style={{ marginTop: 8 }}
            icon={<Icon name="add-circle-outline" size={16} color={colors.primary} />}
          />
        </Card>

        {/* Radius Card */}
        <Card style={styles.card}>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.accent + '18' }]}>
              <Icon name="scan-circle-outline" size={16} color={colors.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Alert Radius</Text>
            <View style={[styles.radiusBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.radiusBadgeText, { color: colors.primary }]}>{formatDistance(selectedRadius)}</Text>
            </View>
          </View>

          <Text style={[styles.radiusDesc, { color: colors.textSecondary }]}>
            Alarm triggers when within this distance of your stop
          </Text>

          {/* Visualizer */}
          <RadiusVisualizer radius={selectedRadius} colors={colors} />

          {/* Slider */}
          <Slider
            style={styles.slider}
            minimumValue={50}
            maximumValue={5000}
            step={50}
            value={selectedRadius}
            onValueChange={setSelectedRadius}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />

          {/* Preset chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {RADIUS_OPTIONS.map((r: number) => {
              const active = selectedRadius === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.presetChip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => setSelectedRadius(r)}
                >
                  <Text style={[styles.presetChipText, { color: active ? '#FFF' : colors.text }]}>{formatDistance(r)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* Alarm Settings */}
        <Card style={styles.card}>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.danger + '18' }]}>
              <Icon name="alarm-outline" size={16} color={colors.danger} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Alarm Settings</Text>
          </View>

          {[
            { label: 'Sound', desc: 'Play alarm sound', value: useSound, onChange: setUseSound, icon: 'volume-high-outline', color: colors.danger },
            { label: 'Vibration', desc: 'Vibrate on arrival', value: useVibration, onChange: setUseVibration, icon: 'phone-portrait-outline', color: colors.warning },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.toggleRow, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
              <View style={[styles.sectionIcon, { backgroundColor: item.color + '15' }]}>
                <Icon name={item.icon} size={15} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={item.value ? colors.primary : colors.textSecondary}
                ios_backgroundColor={colors.border}
              />
            </View>
          ))}
        </Card>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.primary + '0C', borderColor: colors.primary + '25' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="bulb-outline" size={16} color={colors.primary} />
            <Text style={[styles.tipsTitle, { color: colors.primary }]}>Tips</Text>
          </View>
          {['Smaller radius = more precise alert', 'Keep app in background while traveling', 'Ensure battery saver is OFF for best tracking'].map(tip => (
            <View key={tip} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky Start Button */}
      <View style={[styles.stickyBottom, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title={loading ? 'Starting...' : 'Start Trip'}
          onPress={handleStartTracking}
          loading={loading}
          size="large"
          style={{ width: '100%' }}
          icon={!loading ? <Icon name="rocket-outline" size={20} color="#FFF" /> : undefined}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  noDestGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  noDestIconBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  noDestTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  noDestDesc: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  card: { marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  radiusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.pill, borderWidth: 1 },
  radiusBadgeText: { fontSize: 13, fontWeight: '800' },
  nameInput: { fontSize: 20, fontWeight: '700', paddingVertical: 8, borderBottomWidth: 1.5 },
  radiusDesc: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  slider: { width: '100%', height: 40, marginVertical: 8 },
  presetChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1.5 },
  presetChipText: { fontSize: 12, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleDesc: { fontSize: 12, marginTop: 1 },
  tipsCard: { borderRadius: R.lg, padding: 16, borderWidth: 1, marginBottom: 12 },
  tipsTitle: { fontSize: 13, fontWeight: '700' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 },
  tipDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 5 },
  tipText: { fontSize: 13, flex: 1, lineHeight: 18 },
  stickyBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1, ...SHADOWS.elevated,
  },
});

export default TripSetupScreen;
