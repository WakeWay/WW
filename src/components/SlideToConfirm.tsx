/**
 * SlideToConfirm — Slide-to-dismiss gesture component for Alarm screen
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from '@components/Icon';

interface SlideToConfirmProps {
  label?: string;
  onConfirm: () => void;
  color?: string;
  trackColor?: string;
}

const THUMB_SIZE = 56;
const TRACK_PADDING = 6;
const { width: SCREEN_W } = Dimensions.get('window');
const TRACK_WIDTH = Math.min(SCREEN_W - 64, 340);
const MAX_SLIDE = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2;

const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  label = 'Slide to dismiss',
  onConfirm,
  color = '#FFFFFF',
  trackColor = 'rgba(255,255,255,0.25)',
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [confirmed, setConfirmed] = useState(false);
  const isConfirmed = useRef(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isConfirmed.current,
    onMoveShouldSetPanResponder: () => !isConfirmed.current,
    onPanResponderMove: (_, gestureState) => {
      const newX = Math.min(Math.max(0, gestureState.dx), MAX_SLIDE);
      translateX.setValue(newX);
    },
    onPanResponderRelease: (_, gestureState) => {
      const finalX = Math.min(Math.max(0, gestureState.dx), MAX_SLIDE);
      if (finalX >= MAX_SLIDE * 0.85) {
        // Confirmed!
        isConfirmed.current = true;
        setConfirmed(true);
        Animated.spring(translateX, {
          toValue: MAX_SLIDE,
          useNativeDriver: true,
          bounciness: 0,
        }).start(() => {
          setTimeout(onConfirm, 200);
        });
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 8,
        }).start();
      }
    },
  });

  const labelOpacity = translateX.interpolate({
    inputRange: [0, MAX_SLIDE * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const checkOpacity = translateX.interpolate({
    inputRange: [MAX_SLIDE * 0.7, MAX_SLIDE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.track, { width: TRACK_WIDTH, backgroundColor: trackColor }]}>
      {/* Label */}
      <Animated.Text style={[styles.label, { color, opacity: labelOpacity }]}>
        {label}
      </Animated.Text>

      {/* Thumb */}
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: confirmed ? '#10B981' : color,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.View style={{ opacity: checkOpacity, position: 'absolute' }}>
          <Icon name="checkmark" size={24} color={confirmed ? '#FFFFFF' : '#EF4444'} />
        </Animated.View>
        <Animated.View style={{ opacity: labelOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          {/* Already using checkOpacity above */}
        </Animated.View>
        <Icon name="chevron-forward" size={24} color={confirmed ? '#FFFFFF' : '#EF4444'} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: THUMB_SIZE + TRACK_PADDING * 2,
    borderRadius: (THUMB_SIZE + TRACK_PADDING * 2) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TRACK_PADDING,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    width: '100%',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    position: 'absolute',
    left: TRACK_PADDING,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default SlideToConfirm;
