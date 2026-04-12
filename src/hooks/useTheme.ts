import { useColorScheme } from 'react-native';
import { useTripStore } from '@store/useTripStore';
import { COLORS, DARK_COLORS } from '@/constants/theme';

export const useTheme = () => {
  const store = useTripStore();
  const systemTheme = useColorScheme();
  
  const themeMode = store.settings.themeMode || 'system';
  
  const isDark = themeMode === 'system' 
    ? systemTheme === 'dark'
    : themeMode === 'dark';

  const colors = isDark ? DARK_COLORS : COLORS;

  const setDarkMode = (mode: 'system' | 'light' | 'dark') => {
    store.updateSettings({ themeMode: mode });
  };

  return {
    isDark,
    colors,
    themeMode,
    setDarkMode,
  };
};
