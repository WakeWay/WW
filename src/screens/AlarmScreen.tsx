/**
 * Alarm Screen — Dramatic full-screen alarm with slide-to-dismiss
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View, StyleSheet, SafeAreaView, Text, Animated,
  Easing, Dimensions, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@components/Icon';
import { useTripStore } from '@store/useTripStore';
import { useAlarm } from '@hooks/useTracking';
import SlideToConfirm from '@components/SlideToConfirm';
import { SNOOZE_DURATIONS_MINUTES } from '@/constants';
import { COLORS, GRADIENTS, SHADOWS, RADIUS } from '@/constants/theme';
import { TouchableOpacity } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const AlarmScreen = ({ navigation }: any) => {
  const store = useTripStore();
  const { dismissAlarm, snoozeAlarm } = useAlarm();
  const activeTrip = store.activeTrip;

  // Entrance animations
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Bell animation
  const bellRotate = useRef(new Animated.Value(0)).current;
  const bellScale = useRef(new Animated.Value(1)).current;

  // Ring animations (3 expanding rings)
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 8, speed: 6 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Bell shake
    const bellLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bellRotate, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(bellRotate, { toValue: -1, duration: 120, useNativeDriver: true }),
        Animated.timing(bellRotate, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(bellRotate, { toValue: -0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(bellRotate, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );
    bellLoop.start();

    // Bell pulse
    const bellPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(bellScale, { toValue: 1.15, duration: 400, useNativeDriver: true }),
        Animated.timing(bellScale, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    bellPulse.start();

    // Expanding rings
    const ringAnim = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const r1 = ringAnim(ring1, 0);
    const r2 = ringAnim(ring2, 500);
    const r3 = ringAnim(ring3, 1000);
    r1.start(); r2.start(); r3.start();

    return () => { bellLoop.stop(); bellPulse.stop(); r1.stop(); r2.stop(); r3.stop(); };
  }, []);

  const handleDismiss = async () => {
    await dismissAlarm();
    navigation.goBack();
  };

  const handleSnooze = (mins: number) => {
    snoozeAlarm(mins);
    navigation.goBack();
  };

  if (!activeTrip) return null;

  const bellRotateDeg = bellRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] });

  const makeRingStyle = (anim: Animated.Value) => ({
    position: 'absolute' as const,
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 0.4, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
  });

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <LinearGradient colors={['#1A0000', '#8B0000', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.gradient}>

        {/* Expanding rings */}
        <View style={styles.ringsContainer} pointerEvents="none">
          <Animated.View style={makeRingStyle(ring1)} />
          <Animated.View style={makeRingStyle(ring2)} />
          <Animated.View style={makeRingStyle(ring3)} />
        </View>

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* Bell icon */}
          <Animated.View style={[styles.bellWrap, { transform: [{ rotate: bellRotateDeg }, { scale: bellScale }] }]}>
            <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']} style={styles.bellBg}>
              <Icon name="alarm" size={64} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Trip name */}
          <Text style={styles.tripLabel}>DESTINATION REACHED</Text>
          <Text style={styles.tripName}>{activeTrip.destinationName}</Text>
          <Text style={styles.subtitle}>Time to wake up! 🎉</Text>

          {/* Distance */}
          {store.currentLocation && activeTrip.distanceToDestination !== null && activeTrip.distanceToDestination !== undefined && (
            <View style={styles.distBox}>
              <Icon name="location" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.distText}>
                {Math.round(activeTrip.distanceToDestination)}m from your stop
              </Text>
            </View>
          )}

          {/* Slide to dismiss */}
          <View style={styles.dismissWrap}>
            <SlideToConfirm
              label="Slide to Dismiss"
              onConfirm={handleDismiss}
              color="#FFFFFF"
              trackColor="rgba(255,255,255,0.2)"
            />
          </View>

          {/* Snooze buttons */}
          <Text style={styles.snoozeLabel}>Or snooze for</Text>
          <View style={styles.snoozeGrid}>
            {SNOOZE_DURATIONS_MINUTES.map((mins: number) => (
              <TouchableOpacity
                key={mins}
                style={styles.snoozeBtn}
                onPress={() => handleSnooze(mins)}
                activeOpacity={0.7}
              >
                <Text style={styles.snoozeMins}>{mins}</Text>
                <Text style={styles.snoozeMin}>min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ringsContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center', width: W, height: H },
  content: { alignItems: 'center', paddingHorizontal: 32, width: '100%', zIndex: 10 },
  bellWrap: { marginBottom: 28 },
  bellBg: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  tripLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  tripName: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 20, fontWeight: '500' },
  distBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.pill,
    paddingVertical: 8, paddingHorizontal: 16, marginBottom: 36,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  distText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  dismissWrap: { width: '100%', marginBottom: 32, alignItems: 'center' },
  snoozeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
  snoozeGrid: { flexDirection: 'row', gap: 12 },
  snoozeBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  snoozeMins: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  snoozeMin: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.5 },
});

export default AlarmScreen;
