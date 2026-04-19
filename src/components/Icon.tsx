import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

// A quick mapping for icons that don't perfectly exist in Ionicons 
// (or might throw a type error if dynamically string evaluated)
const iconFallbackMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  'sleep': 'moon',
  'edit': 'pencil',
};

export const Icon: React.FC<IconProps> = ({ name, size = 24, color, style }) => {
  const iconName = (iconFallbackMap[name] || name) as keyof typeof Ionicons.glyphMap;

  return (
    <Ionicons 
      name={iconName} 
      size={size} 
      color={color} 
      style={style} 
    />
  );
};

export default Icon;
