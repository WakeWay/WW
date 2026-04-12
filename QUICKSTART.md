# ⚡ WakeWay Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install & Setup
```bash
cd WakeWay
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Run on Your Device
- **iOS**: `npm run ios`
- **Android**: `npm run android`
- **Expo Go**: Scan QR code with Expo Go app

---

## 📁 Key Files to Understand

| File | Purpose |
|------|---------|
| [src/App.tsx](src/App.tsx) | Main navigation setup |
| [src/types/index.ts](src/types/index.ts) | TypeScript definitions |
| [src/store/useTripStore.ts](src/store/useTripStore.ts) | State management |
| [src/utils/distanceCalculator.ts](src/utils/distanceCalculator.ts) | Core alarm logic |
| [src/services/locationService.ts](src/services/locationService.ts) | GPS tracking |
| [src/services/notificationService.ts](src/services/notificationService.ts) | Alarm system |

---

## 🧪 Testing Core Features

### Test 1: Permission Request
```
1. Launch app
2. Tap "Start New Trip"
3. Accept location permission
4. Verify map loads
```

### Test 2: Trip Creation
```
1. On map, tap destination
2. Adjust radius slider
3. Toggle sound/vibration
4. Tap "Start Trip"
5. Verify active trip card shows on home
```

### Test 3: Distance Calculation
```
1. With trip active, open console
2. Watch distance change as you move
3. Verify Haversine formula accuracy
npm test -- distanceCalculator
```

### Test 4: Alarm Logic
```
1. Create trip to nearby location
2. Move toward destination
3. Enter radius zone
4. Verify alarm triggers once
5. Snooze or dismiss
```

---

## 🔧 Common Development Commands

```bash
# Development
npm start          # Start dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator

# Testing
npm test           # Run all tests
npm run test:watch # Watch mode
npm test -- --coverage  # Coverage report

# Code Quality
npm run type-check # TypeScript check
npm run lint       # ESLint check
npx prettier --write src/  # Format code

# Debugging
npm start -- --exp-debugger  # React Native debugger
```

---

## 📱 Feature Walkthrough

### Starting a Trip
```
Home Screen
   ↓
[Start New Trip Button]
   ↓
Trip Setup Screen
   ├─→ [Select Destination] → Map Screen
   ├─→ Adjust Radius (100m - 2km)
   ├─→ Toggle Sound/Vibration
   └─→ [Start Trip]
   ↓
Active Trip Tracking (Home Screen)
   └─→ Real-time distance display
```

### When Alarm Triggers
```
Background task detects destination
   ↓
AlarmScreen appears full-screen
   ├─→ Show destination name
   ├─→ Show distance at trigger
   ├─→ Play sound + vibrate
   └─→ Persistent notification
   ↓
User Actions:
   ├─→ [Dismiss] → Stop alarm
   └─→ [Snooze 1/3/5/10m] → Pause alarm
```

### Viewing History
```
Bottom Tab: History
   ├─→ Filter: All Trips / With Alarms
   ├─→ Each trip shows:
   │   ├─→ Destination name
   │   ├─→ Date and time
   │   ├─→ Duration
   │   ├─→ Alarm triggered (Y/N)
   │   └─→ Badge [✓ Alarm]
   └─→ Swipe for more actions
```

---

## 🐛 Troubleshooting Common Issues

### Location Not Updating
```bash
# Solution 1: Restart location tracking
npm start --clear

# Solution 2: Check permissions
- iOS: Settings → Privacy → Location → WakeWay → "Always" or "While Using"
- Android: Settings → Permissions → Location → "Allow all the time"

# Solution 3: Enable mock location (Android testing)
Developer Options → Mock Location App → Select WakeWay
```

### Alarm Not Triggering
```bash
# Enable debug logging
1. Edit src/constants/index.ts
2. Set: LOG_LOCATION_UPDATES = true
3. Set: LOG_DISTANCE_CALCULATIONS = true
4. Watch logs for "[BG-DISTANCE]" messages

# Verify destination in correct format
const dest = { latitude: 37.7749, longitude: -122.4194 };
console.log('Valid coordinates:', isValidCoordinate(dest));
```

### App Crashes on Startup
```bash
# Clear storage and cache
npm start --clear

# Delete app data
- iOS: Delete app from Xcode
- Android: adb shell pm clear com.example.wakeway

# Reset Expo cache
expo start --clear
```

---

## 📊 Monitoring Performance

### Check Battery Usage
```typescript
// Enable battery monitoring
import { useEffect } from 'react';

useEffect(() => {
  const timer = setInterval(() => {
    console.log('Battery check:', {
      tracking: store.isTrackingActive,
      memory: (require('react-native').Platform.OS === 'android' 
        ? 'Check dev options' 
        : 'Check Xcode'),
    });
  }, 60000); // Every minute
  
  return () => clearInterval(timer);
}, []);
```

### Monitor Memory Usage
```bash
# Android: Android Studio Profiler
# iOS: Xcode → Product → Scheme → Profile → Memory
```

---

## 🔐 Security Checklist

- [ ] Location data stays on device (not sent elsewhere)
- [ ] AsyncStorage encrypted on device
- [ ] No sensitive data in logs
- [ ] Permissions used only when necessary
- [ ] Background tasks paused when inactive
- [ ] Privacy policy displayed in app

---

## 📚 Documentation Guide

| File | Purpose |
|------|---------|
| [README.md](README.md) | Project overview & setup |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design & flows |
| [DEPLOYMENT.md](DEPLOYMENT.md) | App Store submission |
| [__tests__/](/__tests__/) | Test examples |

---

## 🆘 Need Help?

### Before Asking for Help:
1. Check the error message console
2. Review logs: `npm start` or Xcode console
3. Search documentation files
4. Check test files for usage examples

### Useful Resources:
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- Project [GitHub Issues](https://github.com/yourname/wakeway/issues)

---

## 🎯 Next Steps After Setup

1. **Verify Core Functionality** (5 min)
   - [ ] App starts without errors
   - [ ] Can create a trip
   - [ ] Map loads and responds to taps

2. **Test on Real Device** (10 min)
   - [ ] iOS device (if available)
   - [ ] Android device (if available)
   - [ ] Permission flows work

3. **Explore Edge Cases** (15 min)
   - [ ] Disable/enable location mid-trip
   - [ ] Force app close and reopen
   - [ ] Move quickly across destination

4. **Deploy to Testing** (optional)
   - [ ] Build APK/IPA locally
   - [ ] TestFlight (iOS) or Firebase TestLab (Android)
   - [ ] Invite testers

5. **Prepare for Production** (when ready)
   - [ ] Follow [DEPLOYMENT.md](DEPLOYMENT.md)
   - [ ] Submit to App Stores
   - [ ] Monitor crash reports

---

## 💡 Pro Tips

✓ Use Redux DevTools browser extension for state debugging
✓ Mock location data in Android Studio for testing
✓ Use React Profiler to find performance bottlenecks
✓ Test with devices set to low power mode
✓ Always test permission denial scenarios
✓ Monitor network with Charles Proxy
✓ Use Sentry for crash reporting early

---

## 🚀 You're All Set!

Your production-ready WakeWay app is now set up and ready to develop. Happy coding! 🎉

For detailed information, see:
- Feature details → [README.md](README.md)
- Architecture → [ARCHITECTURE.md](ARCHITECTURE.md)
- Deployment → [DEPLOYMENT.md](DEPLOYMENT.md)

---

*Last Updated: March 2024*
