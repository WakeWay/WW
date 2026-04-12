/**
 * Reusable UI components
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@hooks/useTheme';
import { COLORS, DARK_COLORS } from '@/constants/theme';
export { COLORS, DARK_COLORS };

// Button Component
interface ButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'success' | 'outline';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  style,
}: ButtonProps) => {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'danger':
        return colors.danger;
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'outline':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.buttonSmall;
      case 'large':
        return styles.buttonLarge;
      default:
        return styles.buttonMedium;
    }
  };

  const buttonBaseStyle = [
    getSizeStyle(),
    { backgroundColor: getBackgroundColor() },
    variant === 'outline' && { borderWidth: 2, borderColor: colors.primary, backgroundColor: 'transparent' },
    style,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.buttonWrapper, buttonBaseStyle]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : "#FFFFFF"} />
      ) : (
        <Text style={[
           styles.buttonText, 
           variant === 'outline' && { color: colors.primary, fontSize: 16, fontWeight: '600' }, 
           disabled && variant === 'outline' && { color: colors.textSecondary }
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// Card Component
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }: CardProps) => {
  const { colors } = useTheme();
  
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, { backgroundColor: colors.surface }, style]}>{children}</View>;
};

// Badge Component
interface BadgeProps {
  text: string;
  variant?: 'primary' | 'danger' | 'success' | 'warning';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'primary', style }: BadgeProps) => {
  const { colors } = useTheme();
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'danger':
        return colors.danger;
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: getBackgroundColor() }, style]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
};

// Loading Spinner
interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size={size} color={color || colors.primary} />
    </View>
  );
};

// Distance Display
interface DistanceDisplayProps {
  distance: number | null;
  radius: number;
  unit?: 'm' | 'km';
}

export const DistanceDisplay: React.FC<DistanceDisplayProps> = ({
  distance,
  radius,
  unit = 'm',
}: DistanceDisplayProps) => {
  const formatDistance = (d: number | null) => {
    if (d === null) return '...';
    if (unit === 'km' && d > 1000) {
      return `${(d / 1000).toFixed(1)} km`;
    }
    return `${Math.round(d)} m`;
  };

  const distanceValue = formatDistance(distance);
  const radiusValue = formatDistance(radius);
  const { colors } = useTheme();

  return (
    <View style={styles.distanceContainer}>
      <Text style={[styles.distanceLabel, { color: colors.textSecondary }]}>Distance to Stop</Text>
      <Text style={[styles.distanceValue, { color: colors.primary }]}>{distanceValue}</Text>
      <Text style={[styles.distanceCaption, { color: colors.textSecondary }]}>Trigger radius: {radiusValue}</Text>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  // Button styles
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonMedium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  buttonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Card styles
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  // Badge styles
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Loading styles
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  // Distance styles
  distanceContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  distanceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  distanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  distanceCaption: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
