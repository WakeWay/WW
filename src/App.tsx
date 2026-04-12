/**
 * Main App component with navigation setup
 */

import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Animated, StyleSheet, Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Auth Stack Navigator
 */
const AuthStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
};

/**
 * Home Stack Navigator
 */
const HomeStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerTitleAlign: 'center',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'WakeWay' }}
      />
      <Stack.Screen
        name="TripSetup"
        component={TripSetupScreen}
        options={{ title: 'New Trip' }}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Select Destination' }}
      />
    </Stack.Navigator>
  );
};

/**
 * Tab Navigator (Main Navigation)
 */
const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: Math.max(insets.bottom + 60, 60),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 20, // Push elevation extremely high for Android upwards shadow
        },
      }}
    >
      <Tab.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }: { color: string; size: number }) => (
            <Text style={{ fontSize: 24 }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color }: { color: string; size: number }) => (
            <Text style={{ fontSize: 24 }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }: { color: string; size: number }) => (
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Root Stack for Alarm Modal
 */
const RootNavigator = () => {
  const activeTrip = useTripStore((state: TripStoreType) => state.activeTrip);
  const isAlarmActive = activeTrip?.alarmTriggered || false;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      } as any}
    >
      <Stack.Screen
        name="MainApp"
        component={TabNavigator}
        options={{
          headerShown: false,
        }}
      />
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
                opacity: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
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
  useAppLifecycle(); // Initialize app state and lifecycle handlers
  const { isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);
  
  const restoreSession = useAuthStore(state => state.restoreSession);
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);

  useEffect(() => {
    const initApp = async () => {
      await restoreSession();
      setIsReady(true);
      // Hide the native splash screen immediately when app renders and auth is checked
      SplashScreen.hideAsync().catch(() => {});
    };
    initApp();
  }, [restoreSession]);

  if (!isReady) {
    return null; // Keep splash screen visible perfectly while restoring session
  }

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: '#0F172A' },
  };

  const CustomLightTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#F8FAFC' },
  };

  return (
    <View style={{ flex: 1 }}>
      <AlertProvider>
        <NavigationContainer theme={isDark ? CustomDarkTheme : CustomLightTheme}>
          {isLoggedIn ? <RootNavigator /> : <AuthStackNavigator />}
        </NavigationContainer>
      </AlertProvider>
    </View>
  );
};

export default App;
