/**
 * Temporary Icon component using emoji instead of vector-icons
 * This bypasses the font loading issues with Ionicons
 */

import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { getEmojiIcon } from '@utils/iconMapper';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color, style }) => {
  const emoji = getEmojiIcon(name);

  return (
    <Text
      style={[
        {
          fontSize: size,
          color: color,
          lineHeight: size * 1.3,
        },
        style,
      ]}
    >
      {emoji}
    </Text>
  );
};

export default Icon;
