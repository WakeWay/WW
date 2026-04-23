/**
 * AnimatedNumber — Count-up animation for stat displays
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  style,
  suffix = '',
  prefix = '',
  duration = 800,
  decimals = 0,
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const displayValue = useRef('0');
  const [_, forceRender] = React.useReducer(x => x + 1, 0);

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animValue.addListener(({ value: v }) => {
      displayValue.current = v.toFixed(decimals);
      forceRender();
    });

    return () => animValue.removeListener(listener);
  }, [value]);

  return (
    <Text style={style}>
      {prefix}{displayValue.current}{suffix}
    </Text>
  );
};

export default AnimatedNumber;
