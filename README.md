# WakeWay - Location-Based Alarm Application

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Development Guide](#development-guide)
- [Testing Strategy](#testing-strategy)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)

---

## 🎯 Project Overview

**WakeWay** is a production-grade location-based alarm application built with React Native and Expo. It solves the critical problem of missing transportation stops by triggering an alert when users enter a configurable radius around their destination.

### Key Problem Solved
- ✈️ Travelers missing their stop due to sleep or distraction
- 📍 Lack of real-time destination awareness
- 🔔 Need for reliable background location tracking

### Core Value Proposition
- **Battery Efficient**: Optimized location tracking
- **Reliable**: Works even when app is closed
- **Simple**: One-tap trip setup
- **Smart**: GPS-aware, drift-protected logic

---

## 🧱 Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Runtime** | React Native | 0.73.0 | Cross-platform mobile framework |
| **Meta-Framework** | Expo | ~50.0.0 | Simplified RN development |
| **Language** | TypeScript | ~5.3.0 | Type safe development |
| **State** | Zustand | ^4.4.0 | Lightweight state management |
| **Location** | Expo Location | ~16.5.0 | GPS tracking |
| **Background** | Expo Task Manager | ~11.6.0 | Background tasks |
| **Maps** | react-native-maps | 1.7.1 | Map visualization |
| **Notifications** | Expo Notifications | ~0.27.0 | Alarms & alerts |
| **Navigation** | @react-navigation | ^4.11.13 | Screen routing |
| **Storage** | AsyncStorage | ^1.21.0 | Persistent data |
| **Testing** | Jest + Expo | ^29.5.0 | Unit & integration tests |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16.0 or higher
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android) or Xcode (for iOS)

### Initial Setup

```bash
# 1. Navigate to project directory
cd WakeWay

# 2. Install dependencies
npm install
# or
yarn install

# 3. Install additional native dependencies
expo install expo-location expo-task-manager expo-notifications react-native-maps

# 4. Set up environment
cp .env.example .env

# 5. Start development server
npm start
```

### Running on Physical Device

```bash
# iOS
npm run ios

# Android
npm run android

# Web (limited functionality)
npm run web

# Expo Go App
npm start
# Scan QR code with Expo Go app on phone
```

---

## 📁 Project Structure

```
WakeWay/
├── src/
│   ├── App.tsx                    # Main entry point with navigation
│   ├── components/
│   │   └── UIComponents.tsx       # Reusable UI elements
│   ├── screens/
│   │   ├── HomeScreen.tsx         # Main dashboard
│   │   ├── TripSetupScreen.tsx    # Trip configuration
│   │   ├── MapScreen.tsx          # Destination selection
│   │   ├── AlarmScreen.tsx        # Full-screen alarm
│   │   ├── HistoryScreen.tsx      # Trip history
│   │   └── SettingsScreen.tsx     # User preferences
│   ├── services/
│   │   ├── locationService.ts     # GPS tracking logic
│   │   └── notificationService.ts # Alarm system
│   ├── store/
│   │   └── useTripStore.ts        # Zustand state management
│   ├── hooks/
│   │   └── useTracking.ts         # Custom React hooks
│   ├── tasks/
│   │   └── backgroundTasks.ts     # Background task handlers
│   ├── utils/
│   │   ├── distanceCalculator.ts  # Haversine formula
│   │   └── storage.ts             # AsyncStorage helpers
│   ├── types/
│   │   └── index.ts               # TypeScript definitions
│   └── constants/
│       └── index.ts               # App configuration
├── __tests__/
│   └── distanceCalculator.test.ts # Unit tests
├── assets/                         # Images, fonts, sounds
├── package.json                    # Dependencies
├── app.json                        # Expo configuration
├── tsconfig.json                   # TypeScript config
├── babel.config.js                 # Babel configuration
└── README.md                       # This file
```

---

## 🌟 Core Features

### 1. **One-Tap Trip Starting**
```typescript
// User experience flow
User taps "Start Trip"
  ↓
Request location permission
  ↓
Select destination on map
  ↓
Configure alert radius & settings
  ↓
Begin tracking
```

### 2. **Background Location Tracking**
- Foreground + background location updates
- Optimized for battery (updates every 15 seconds)
- Continues when screen off or app minimized
- Task Manager integration for reliability

### 3. **Smart Alarm System**
- Haversine formula for accurate distance
- GPS drift protection (jump detection)
- 7% buffer to prevent missed alerts
- Sound + vibration + notification
- One-alarm-per-trip guarantee

### 4. **Map Integration**
- Real-time current location
- Destination marker
- Radius visualization circle
- Distance display

### 5. **Trip Management**
- Save multiple trips
- View trip history
- Cancel active trips
- Replay past trips

---

## 🏗️ Architecture

### State Management (Zustand)
```typescript
// Single source of truth
const store = useTripStore();

// Core state shape
{
  activeTrip: Trip | null,
  trips: Trip[],
  tripHistory: TripHistory[],
  currentLocation: LocationData | null,
  permissions: PermissionsState,
  settings: AppSettings,
  error: AppError | null,
  isLoadingLocation: boolean,
  isTrackingActive: boolean
}
```

### Service Layer
```
├── locationService (Expo Location API)
│   ├── requestPermissions()
│   ├── getCurrentLocation()
│   ├── startLocationWatching()
│   ├── startBackgroundLocationTask()
│   └── checkAndTriggerAlarm()
│
└── notificationService (Expo Notifications)
    ├── requestPermissions()
    ├── triggerFullAlarm()
    ├── playAlarmSound()
    └── dismissAlarm()
```

### Background Task Flow
```
User location update (every 15 seconds)
  ↓
Calculate distance to destination
  ↓
Check if within radius zone
  ↓
Prevent duplicate triggers
  ↓
Trigger alarm (sound + notification + vibration)
  ↓
Navigate user to AlarmScreen
```

---

## 🛠️ Development Guide

### Adding New Features

#### Example: Add Snooze Timer Visualization

```typescript
// 1. Add to types
// src/types/index.ts
export interface Trip {
  snoozeUntil?: number; // Unix timestamp
}

// 2. Update store action
// src/store/useTripStore.ts
snoozeAlarm: (minutes) => {
  set((state) => ({
    activeTrip: {
      ...state.activeTrip,
      snoozeUntil: Date.now() + minutes * 60 * 1000,
    }
  }))
}

// 3. Update component
// src/screens/AlarmScreen.tsx
{snoozeUntil && (
  <CountdownTimer until={snoozeUntil} />
)}

// 4. Test
npm test
```

### Common Development Tasks

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Format code
npx prettier --write src/

# Clean build cache
expo prebuild --clean
```

---

## 🧪 Testing Strategy

### Unit Tests (Distance Calculation)
```typescript
describe('Distance Calculator', () => {
  test('SF to LA distance', () => {
    const distance = calculateDistance(SF, LA);
    expect(distance).toBeGreaterThan(550000);
  });

  test('Alarm triggers within radius', () => {
    const result = isWithinRadius(current, dest, 500);
    expect(result).toBe(true);
  });
});
```

### Integration Tests (Alarm Flow)
```typescript
// Test complete flow
1. Create trip
2. Simulate movement to destination
3. Verify alarm triggered
4. Verify only once per trip
5. Verify sound/vibration called
```

### Manual Test Scenarios

#### Scenario 1: High-Speed Travel
```
✓ Start trip with 500m radius
✓ Drive at 60 km/h toward destination
✓ Verify alarm triggers when approaching
✓ Check no false positives during drive
```

#### Scenario 2: GPS Dropout
```
✓ Start trip
✓ Disable location permission mid-trip
✓ Re-enable permission
✓ Verify tracking resumes
```

#### Scenario 3: App Backgrounding
```
✓ Start trip
✓ Send app to background
✓ Move to destination (with screen off)
✓ Verify alarm still triggers
```

#### Scenario 4: Battery Saver Mode
```
✓ Enable device battery saver
✓ Start trip
✓ Move to destination
✓ Verify tracking still works
```

### Test Commands
```bash
npm test                      # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
```

---

## 📦 Deployment

### Build for iOS

```bash
# Option 1: Using EAS (Recommended)
npm install -g eas-cli
eas build --platform ios

# Option 2: Local build
expo build:ios

# Option 3: Development build
expo run:ios
```

### Build for Android

```bash
# Option 1: EAS
eas build --platform android

# Option 2: Local build
expo build:android

# Option 3: APK for testing
eas build --platform android --local
```

### Environment Configuration

```bash
# .env
EXPO_PUBLIC_API_URL=https://api.wakeway.com
EXPO_PUBLIC_MAPS_API_KEY=your_key_here
EXPO_PUBLIC_ENVIRONMENT=production
```

### App Store Submission

#### iOS App Store
1. Update version in `app.json`
2. Build: `eas build --platform ios`
3. Submit: `eas submit --platform ios`

#### Google Play Store
1. Update `versionCode` in `app.json`
2. Build: `eas build --platform android --release-channel production`
3. Submit: `eas submit --platform android`

### Production Checklist
- [ ] Permissions properly requested
- [ ] Error handling for all edge cases
- [ ] Battery optimization enabled
- [ ] Notification templates finalized
- [ ] Privacy policy added
- [ ] App signing certificates ready
- [ ] Analytics integration (Sentry/Firebase)
- [ ] Crash reporting enabled
- [ ] Performance tested on low-end devices
- [ ] Accessibility (A11y) reviewed

---

## 🔧 Troubleshooting

### Location Not Updating
```typescript
// Check: Permissions granted
const perms = await locationService.checkPermissions();
console.log('Location permission:', perms.location);

// Check: Background task registered
const isTaskDefined = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
console.log('Background task active:', isTaskDefined);

// Solution: Restart location tracking
await locationService.startLocationWatching();
await locationService.startBackgroundLocationTask();
```

### Alarm Not Triggering
```typescript
// Debug: Enable logging
LOG_LOCATION_UPDATES = true;
LOG_DISTANCE_CALCULATIONS = true;

// Check logs
console.log('[BG-DISTANCE]', { distance, radius });

// Verify alarm logic
const isInRadius = isWithinRadius(location, dest, radius);
console.log('Within radius:', isInRadius);
```

### App Crashes on Startup
```typescript
// Clear corrupted storage
await clearAllStorage();

// Restart app
expo start --c  // Clear cache
```

### Background Task Not Starting
```bash
# Android: Check battery optimization
Settings → Battery → Battery Saver → WakeWay → Don't optimize

# iOS: Enable "Allow Background App Refresh"
Settings → Privacy → Motion & Fitness → Enable access

# Restart location service
npm start --clear
```

---

## ⚡ Performance Optimization

### Battery Optimization
```typescript
// ✓ Already implemented
- Location updates throttled to 15s intervals
- Distance-based filtering (10m minimum change)
- Background task pauses when stationary
- Foreground service notification shows tracking

// Recommendations
- Avoid continuous map rendering
- Use React.memo for components
- Lazy load history screen
- Debounce user interactions
```

### Memory Optimization
```typescript
// ✓ Already implemented
- Zustand (lightweight store)
- AsyncStorage only for essentials
- Cleanup subscriptions in useEffect
- Remove listeners on app unmount

// Recommendations
- Profile with React DevTools
- Use Hermes engine (faster JS)
- Monitor memory with Android Profiler
- Limit history to 100 trips
```

### Network Optimization
```typescript
// Recommendations
- Cache map tiles locally
- Queue failed API calls
- Use web workers for heavy calculations
- Compress images for notifications
```

### Code Splitting
```typescript
// Already using navigation-based code splitting
const HomeStack = () => {
  // HomeScreen lazy loaded
  // TripSetupScreen lazy loaded
  // MapScreen lazy loaded
}
```

---

## 📊 Analytics & Monitoring

### Recommended Services
- **Crash Reporting**: Sentry, Bugsnag
- **Analytics**: Firebase Analytics, Mixpanel
- **Performance**: Firebase Performance Monitoring
- **Logs**: LogRocket, Datadog

### Key Metrics to Track
```typescript
- Alarm trigger rate
- Location accuracy (meters)
- Battery drain rate
- App crash rate
- User retention (7-day, 30-day)
- Average trip duration
- False alarm rate
```

---

## 🔒 Security Considerations

### Permission Handling
```typescript
// ✓ Implemented
- Graceful permission denial handling
- Clear permission request messaging
- Background location only when necessary
- Privacy policy accessible

// Recommendations
- Encrypt sensitive location data
- Use HTTPS for APIs
- Implement certificate pinning
- Log permission changes
```

### Data Privacy
- Location data stored locally (not sent to server)
- History stored in AsyncStorage (device only)
- No user tracking without explicit consent
- GDPR-compliant data deletion

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [Background Location Tracking Best Practices](https://developer.android.com/develop/sensors-and-location/location/background-location-updates)

---

## 📝 License

WakeWay © 2024. All rights reserved.

---

## 👥 Contributing

Contributions welcome! Please follow these guidelines:
1. Create feature branch: `git checkout -b feature/your-feature`
2. Write tests
3. Submit PR with description

---

## 🚀 Future Enhancements

- [ ] Voice assistant integration
- [ ] Smart ETA prediction
- [ ] Favorite destinations
- [ ] Shared trips with friends
- [ ] Smart route optimization
- [ ] Multiple alarm conditions
- [ ] Wearable app (Apple Watch)
- [ ] Server sync for backup
- [ ] Real-time traffic integration

---

*Built with ❤️ for travelers who don't want to miss their stop.*
