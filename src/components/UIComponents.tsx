/**
 * Reusable UI components — Premium edition
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  ViewStyle,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@hooks/useTheme';
import { COLORS, DARK_COLORS, GRADIENTS, SHADOWS, RADIUS } from '@/constants/theme';
export { COLORS, DARK_COLORS };

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'success' | 'outline' | 'warning' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  style,
  icon,
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const sizeStyle = {
    small: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.sm },
    medium: { paddingVertical: 13, paddingHorizontal: 24, borderRadius: RADIUS.md },
    large: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: RADIUS.lg },
  }[size];

  const textSize = { small: 13, medium: 15, large: 17 }[size];

  const isGradient = (variant === 'primary' || variant === 'danger' || variant === 'success') && !disabled;
  const gradientColors: string[] = ({
    primary: GRADIENTS.primaryVibrant,
    danger: ['#FF6B6B', '#EF4444'],
    success: ['#34D399', '#10B981'],
    warning: ['#FCD34D', '#F59E0B'],
    outline: ['transparent', 'transparent'],
    ghost: ['transparent', 'transparent'],
  }[variant] ?? GRADIENTS.primaryVibrant) as string[];

  const getFlatColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'warning': return colors.warning;
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    if (variant === 'outline') return colors.primary;
    if (variant === 'ghost') return colors.textSecondary;
    return '#FFFFFF';
  };

  const shadowStyle = (!disabled && variant === 'primary') ? SHADOWS.primary
    : (!disabled && variant === 'danger') ? SHADOWS.danger
    : (!disabled && variant === 'success') ? SHADOWS.success
    : {};

  const inner = (
    <View style={[styles.buttonInner, sizeStyle]}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <View style={styles.buttonIcon}>{icon}</View>}
          <Text style={[styles.buttonText, { fontSize: textSize, color: getTextColor() }]}>{title}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, shadowStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={{ borderRadius: sizeStyle.borderRadius, overflow: 'hidden' }}
      >
        {isGradient ? (
          <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {inner}
          </LinearGradient>
        ) : (
          <View style={[
            { backgroundColor: getFlatColor() },
            (variant === 'outline') && { borderWidth: 1.5, borderColor: disabled ? colors.border : colors.primary },
            { borderRadius: sizeStyle.borderRadius },
          ]}>
            {inner}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'glass' | 'gradient-border';
  gradientBorderColor?: string;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, variant = 'default', gradientBorderColor }) => {
  const { colors, isDark } = useTheme();

  const baseStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginVertical: 6,
    ...SHADOWS.subtle,
  };

  const variantStyle: ViewStyle =
    variant === 'elevated' ? { ...SHADOWS.elevated } :
    variant === 'glass' ? {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
      ...SHADOWS.medium,
    } :
    variant === 'gradient-border' ? {
      borderWidth: 1.5,
      borderColor: gradientBorderColor || colors.primary,
      ...SHADOWS.medium,
    } : {};

  if (onPress) {
    return (
      <TouchableOpacity
        style={[baseStyle, variantStyle, style]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[baseStyle, variantStyle, style]}>{children}</View>;
};

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  text: string;
  variant?: 'primary' | 'danger' | 'success' | 'warning' | 'muted';
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'primary', style, size = 'md' }) => {
  const { colors } = useTheme();

  const bgColors = {
    primary: colors.primary + '20',
    danger: colors.danger + '20',
    success: colors.success + '20',
    warning: colors.warning + '20',
    muted: colors.border,
  };

  const textColors = {
    primary: colors.primary,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warningDark || colors.warning,
    muted: colors.textSecondary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgColors[variant], paddingVertical: size === 'sm' ? 3 : 5, paddingHorizontal: size === 'sm' ? 8 : 12 }, style]}>
      <Text style={[styles.badgeText, { color: textColors[variant], fontSize: size === 'sm' ? 10 : 12 }]}>{text}</Text>
    </View>
  );
};

// ─── Loading Spinner ──────────────────────────────────────────────────────────

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'large', color }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size={size} color={color || colors.primary} />
    </View>
  );
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

export const SkeletonLoader: React.FC<{ width?: number | string; height?: number; borderRadius?: number; style?: ViewStyle }> = ({
  width = '100%',
  height = 16,
  borderRadius = RADIUS.sm,
  style,
}) => {
  const { colors } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: colors.border, opacity: opacityAnim }, style]}
    />
  );
};

// ─── Distance Display ─────────────────────────────────────────────────────────

interface DistanceDisplayProps {
  distance: number | null;
  radius: number;
}

export const DistanceDisplay: React.FC<DistanceDisplayProps> = ({ distance, radius }) => {
  const { colors } = useTheme();

  const formatDist = (d: number | null) => {
    if (d === null) return '—';
    if (d >= 1000) return `${(d / 1000).toFixed(1)} km`;
    return `${Math.round(d)} m`;
  };

  const getStatusColor = () => {
    if (distance === null) return colors.textSecondary;
    const pct = distance / (radius * 3);
    if (pct <= 0.33) return colors.danger;
    if (pct <= 0.66) return colors.warning;
    return colors.success;
  };

  return (
    <View style={[styles.distanceContainer, { backgroundColor: getStatusColor() + '12', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: getStatusColor() + '30' }]}>
      <Text style={[styles.distanceLabel, { color: colors.textSecondary }]}>Distance to Stop</Text>
      <Text style={[styles.distanceValue, { color: getStatusColor() }]}>{formatDist(distance)}</Text>
      <Text style={[styles.distanceCaption, { color: colors.textMuted || colors.textSecondary }]}>Alert radius: {formatDist(radius)}</Text>
    </View>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

export const SectionHeader: React.FC<{ title: string; right?: React.ReactNode; style?: ViewStyle }> = ({ title, right, style }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={[styles.sectionHeaderText, { color: colors.text }]}>{title}</Text>
      {right}
    </View>
  );
};

// ─── Divider ─────────────────────────────────────────────────────────────────

export const Divider: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border, marginVertical: 4 }, style]} />;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  buttonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badge: {
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  distanceContainer: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginVertical: 8,
  },
  distanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  distanceValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 4,
  },
  distanceCaption: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
