/**
 * Temporary emoji icon mapper to work around vector-icons issues
 * Maps Ionicons names to emoji equivalents
 */

const iconMap: Record<string, string> = {
  home: '🏠',
  'time': '📋',
  'settings': '⚙️',
  'location': '📍',
  'location-sharp': '📍',
  'alarm': '⏰',
  'airplane': '✈️',
  'sleep': '😴',
  'chevron-forward': '›',
  'chevron-down': '▼',
  'close': '✕',
  'add': '+',
  'play': '▶️',
  'pause': '⏸',
  'stop': '⏹',
  'refresh': '🔄',
  'checkmark': '✓',
  'checkmark-circle': '✅',
  'checkmark-done': '✓✓',
  'information-circle': 'ℹ️',
  'warning': '⚠️',
  'trash': '🗑️',
  'trash-outline': '🗑️',
  'edit': '✎',
  'heart': '❤️',
  'star': '⭐',
  'share': '↗️',
  'notifications': '🔔',
  'log-out-outline': '🚪',
};

export const getEmojiIcon = (iconName: string): string => {
  return iconMap[iconName] || iconName;
};
