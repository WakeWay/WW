/**
 * ProximityRing — Animated proximity indicator using pure React Native Animated
 * Uses concentric ring + fill approach (no SVG dependency needed)
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

interface ProximityRingProps {
  /** 0 = at destination, 1 = far away */
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

const ProximityRing: React.FC<ProximityRingProps> = ({
  progress,
  size = 160,
  strokeWidth = 10,
  children,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fillAnim = useRef(new Animated.Value(1 - progress)).current;
  const ring1Opacity = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0.3)).current;
  const ring3Opacity = useRef(new Animated.Value(0.15)).current;

  // Clamp: 0 = far (small fill), 1 = at destination (full fill)
  const clampedFill = Math.min(Math.max(1 - progress, 0), 1);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: clampedFill,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clampedFill]);

  // Pulse when close
  useEffect(() => {
    if (progress < 0.3) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [progress < 0.3]);

  // Color based on proximity
  const getColor = () => {
    if (progress > 0.6) return '#10B981';  // far — green
    if (progress > 0.25) return '#F59E0B'; // medium — amber
    return '#EF4444';                      // close — red
  };

  const color = getColor();
  const innerSize = size - strokeWidth * 2;

  // Animated border color via interpolation trick
  const borderColor = color;
  const bgColor = color + '18';

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor,
          backgroundColor: bgColor,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Inner progress fill ring */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Animated fill from bottom */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: color + '25',
            height: fillAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />

        {/* Center content */}
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
});

export default ProximityRing;
