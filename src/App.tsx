/**
 * Main App component with navigation setup — Premium edition
 */

import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Animated, StyleSheet, Image, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAppLifecycle } from '@hooks/useTracking';
import { useTheme } from '@hooks/useTheme';
import { AlertProvider } from './providers/AlertProvider';

// Keep the native splash screen visible until our React overlay takes over
SplashScreen.preventAutoHideAsync().catch(() => {});

import { useTripStore, type TripStoreType } from '@store/useTripStore';

// Screens
import HomeScreen from '@screens/HomeScreen';
import TripSetupScreen from '@screens/TripSetupScreen';
import MapScreen from '@screens/MapScreen';
import AlarmScreen from '@screens/AlarmScreen';
import HistoryScreen from '@screens/HistoryScreen';
import SettingsScreen from '@screens/SettingsScreen';
import LoginScreen from '@screens/auth/LoginScreen';
import SignupScreen from '@screens/auth/SignupScreen';
import { useAuthStore } from '@store/useAuthStore';
import Icon from '@components/Icon';
import { COLORS, DARK_COLORS } from '@/constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { name: 'HomeStack', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'History', label: 'History', icon: 'time', iconOutline: 'time-outline' },
  { name: 'Settings', label: 'Settings', icon: 'settings', iconOutline: 'settings-outline' },
] as const;

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const activeTrip = useTripStore((s: TripStoreType) => s.activeTrip);
  const isTracking = !!activeTrip;

  // Animated indicator
  const indicatorAnim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: state.index,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [state.index]);

  const tabWidth = 375 / TABS.length; // approximate, good enough for indicator

  const translateX = indicatorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2],
  });

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: isDark ? '#0D1420' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
        },
      ]}
    >
      {/* Sliding active pill */}
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            width: tabWidth * 0.5,
            backgroundColor: colors.primary + '18',
            transform: [{ translateX: Animated.add(translateX, new Animated.Value(tabWidth * 0.25)) }],
          },
        ]}
        pointerEvents="none"
      />

      {state.routes.map((route: any, index: number) => {
        const tab = TABS[index];
        const isFocused = state.index === index;
        const scaleAnim = useRef(new Animated.Value(1)).current;

        const onPress = () => {
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 10 }),
          ]).start();

          if (!isFocused) {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!event.defaultPrevented) navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={1}
          >
            <Animated.View style={[styles.tabIconWrap, { transform: [{ scale: scaleAnim }] }]}>
              {/* Tracking badge on Home */}
              {index === 0 && isTracking && (
                <View style={[styles.trackingBadge, { backgroundColor: colors.success }]} />
              )}
              <Icon
                name={isFocused ? tab.icon : tab.iconOutline}
                size={22}
                color={isFocused ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? colors.primary : colors.textSecondary,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * Auth Stack Navigator
 */
const AuthStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
  </Stack.Navigator>
);

/**
 * Home Stack Navigator
 */
const HomeStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      headerTitleAlign: 'center',
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen name="HomeTab" component={HomeScreen} options={{ title: 'WakeWay' }} />
  </Stack.Navigator>
);

/**
 * Tab Navigator (Main Navigation)
 */
const TabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="HomeStack" component={HomeStackNavigator} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

/**
 * Root Stack for Alarm Modal
 */
const RootNavigator = () => {
  const activeTrip = useTripStore((state: TripStoreType) => state.activeTrip);
  const isAlarmActive = activeTrip?.alarmTriggered || false;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false } as any}>
      <Stack.Screen name="MainApp" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="TripSetup" component={TripSetupScreen} options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false, presentation: 'card' }} />
      {isAlarmActive && (
        <Stack.Screen
          name="Alarm"
          component={AlarmScreen}
          options={{
            cardStyle: { backgroundColor: 'transparent' },
            cardOverlayEnabled: true,
            cardStyleInterpolator: ({ current: { progress } }: any) => ({
              cardStyle: {
                opacity: progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.7, 1],
                }),
              },
              overlayStyle: {
                opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
              },
            }),
          } as any}
        />
      )}
    </Stack.Navigator>
  );
};

/**
 * Main App Component
 */
const App = () => {
  useAppLifecycle();
  const { isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);

  const restoreSession = useAuthStore(state => state.restoreSession);
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);

  useEffect(() => {
    const initApp = async () => {
      await restoreSession();
      await useTripStore.getState().restoreAppState();
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    };
    initApp();
  }, [restoreSession]);

  if (!isReady) return null;

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: '#0A0F1E' },
  };

  const CustomLightTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#F0F7FF' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0A0F1E' : '#F0F7FF' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor="transparent" translucent={true} />
      <AlertProvider>
        <NavigationContainer theme={isDark ? CustomDarkTheme : CustomLightTheme}>
          {isLoggedIn ? <RootNavigator /> : <AuthStackNavigator />}
        </NavigationContainer>
      </AlertProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    height: 36,
    borderRadius: 18,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  trackingBadge: {
    position: 'absolute',
    top: 0,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.2,
  },
});

export default App;
