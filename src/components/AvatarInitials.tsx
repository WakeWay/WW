/**
 * AvatarInitials — Profile avatar generated from email/name initials
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AvatarInitialsProps {
  email?: string;
  name?: string;
  size?: number;
  fontSize?: number;
}

/** Generates a consistent hue from a string */
const stringToHue = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
};

const getInitials = (email?: string, name?: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }
  return 'WW';
};

const AvatarInitials: React.FC<AvatarInitialsProps> = ({
  email,
  name,
  size = 64,
  fontSize,
}) => {
  const initials = getInitials(email, name);
  const hue = stringToHue(email || name || 'WakeWay');
  const gradStart = `hsl(${hue}, 70%, 45%)`;
  const gradEnd = `hsl(${(hue + 40) % 360}, 75%, 55%)`;
  const textSize = fontSize || Math.round(size * 0.36);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient
        colors={[gradStart, gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: size / 2 }]}
      >
        <Text style={[styles.initials, { fontSize: textSize }]}>{initials}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default AvatarInitials;
