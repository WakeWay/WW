/**
 * FloatingLabelInput — Text input with animated floating label
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  StyleSheet,
  KeyboardTypeOptions,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import Icon from '@components/Icon';
import { RADIUS } from '@/constants/theme';

interface FloatingLabelInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  style?: ViewStyle;
  icon?: string;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  error,
  style,
  icon,
  ...rest
}) => {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.parallel([
      Animated.timing(labelAnim, { toValue: 1, duration: 180, useNativeDriver: false }),
      Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }),
    ]).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    if (!value) {
      Animated.timing(labelAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    }
  };

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, -8] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 12] });
  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.textSecondary, isFocused ? colors.primary : colors.textSecondary],
  });
  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? colors.danger : colors.border, error ? colors.danger : colors.primary],
  });

  return (
    <View style={[styles.wrapper, style]}>
      <Animated.View style={[styles.container, { borderColor, borderRadius: RADIUS.md }]}>
        {/* Floating label */}
        <Animated.Text
          style={[
            styles.label,
            {
              top: labelTop,
              fontSize: labelSize,
              color: error ? colors.danger : labelColor,
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
              left: icon ? 44 : 14,
            },
          ]}
          pointerEvents="none"
        >
          {label}
        </Animated.Text>

        <View style={styles.inputRow}>
          {icon && (
            <View style={styles.iconLeft}>
              <Icon name={icon} size={18} color={isFocused ? colors.primary : colors.textSecondary} />
            </View>
          )}
          <TextInput
            style={[styles.input, { color: colors.text, paddingLeft: icon ? 0 : 14 }]}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={secureTextEntry && !showPassword}
            keyboardType={keyboardType}
            autoCapitalize="none"
            placeholderTextColor="transparent"
            {...rest}
          />
          {secureTextEntry && (
            <TouchableOpacity style={styles.iconRight} onPress={() => setShowPassword(v => !v)}>
              <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
      {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  container: {
    borderWidth: 1.5,
    position: 'relative',
    paddingTop: 4,
  },
  label: {
    position: 'absolute',
    paddingHorizontal: 4,
    fontWeight: '600',
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconLeft: {
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
  },
  iconRight: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    paddingRight: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 14,
  },
});

export default FloatingLabelInput;
