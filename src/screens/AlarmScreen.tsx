/**
 * Alarm Screen - Full-screen alarm notification
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from '@components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripStore } from '@store/useTripStore';
import { useAlarm } from '@hooks/useTracking';
import { Button, COLORS } from '@components/UIComponents';
import { SNOOZE_DURATIONS_MINUTES } from '@/constants';
import LinearGradient from 'expo-linear-gradient';
const LinearGradientComponent = LinearGradient as unknown as React.FC<any>;

const AlarmScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const store = useTripStore();
  const { dismissAlarm, snoozeAlarm } = useAlarm();
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [opacityAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  const activeTrip = store.activeTrip;

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, []);

  const handleDismiss = async () => {
    await dismissAlarm();
    navigation.goBack();
  };

  const handleSnooze = (minutes: number) => {
    snoozeAlarm(minutes);
    navigation.goBack();
  };

  if (!activeTrip) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradientComponent
        colors={[COLORS.danger, '#FF5A52']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Pulsing Background Circle */}
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              transform: [{ scale: pulseAnim }],
              opacity: 0.2,
            },
          ]}
        />

        {/* Main Content */}
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon name="alarm" size={80} color="#FFFFFF" />
          </View>

          {/* Alert Text */}
          <Text style={styles.title}>Stop Alert</Text>
          <Text style={styles.destination}>
            You've reached {activeTrip.destinationName}!
          </Text>

          {/* Distance Info */}
          {store.currentLocation && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Distance</Text>
              <Text style={styles.infoValue}>
                {Math.round(activeTrip.distanceToDestination || 0)} meters away
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>

          {/* Snooze Options */}
          <View style={styles.snoozeContainer}>
            <Text style={styles.snoozeLabel}>Snooze for</Text>
            <View style={styles.snoozeButtons}>
              {SNOOZE_DURATIONS_MINUTES.map((minutes: number) => (
                <TouchableOpacity
                  key={minutes}
                  style={styles.snoozeButton}
                  onPress={() => handleSnooze(minutes)}
                >
                  <Text style={styles.snoozeButtonText}>{minutes}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </LinearGradientComponent>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FFFFFF',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  destination: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.9,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    alignItems: 'center',
    width: '100%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actions: {
    width: '100%',
    marginBottom: 32,
  },
  dismissButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.danger,
  },
  snoozeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  snoozeLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 12,
    opacity: 0.8,
  },
  snoozeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  snoozeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  snoozeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AlarmScreen;
