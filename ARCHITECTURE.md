# WakeWay Architecture Documentation

## 📐 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WakeWay Mobile Application               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Presentation Layer (Screens)              │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  • HomeScreen (Trip Dashboard)                       │  │
│  │  • TripSetupScreen (Configuration)                   │  │
│  │  • MapScreen (Destination Selection)                 │  │
│  │  • AlarmScreen (Full-Screen Alert)                   │  │
│  │  • HistoryScreen (Trip Analytics)                    │  │
│  │  • SettingsScreen (User Preferences)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▲                                 │
│                           │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        Navigation Layer (@react-navigation)          │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  • Stack Navigator (Home Stack)                      │  │
│  │  • Tab Navigator (Main Navigation)                   │  │
│  │  • Root Navigator (Alarm Modal Overlay)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▲                                 │
│                           │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Custom Hooks Layer (Business Logic)             │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  • useLocationTracking()                             │  │
│  │  • useLocationPermissions()                          │  │
│  │  • useActiveTrip()                                   │  │
│  │  • useAlarm()                                        │  │
│  │  • useAppLifecycle()                                 │  │
│  │  • useFilteredLocationUpdates()                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▲                                 │
│                           │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     State Management Layer (Zustand Store)           │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  • Store: useTripStore                               │  │
│  │  • Global state shape                                │  │
│  │  • Actions for state mutations                       │  │
│  │  • Persistence to AsyncStorage                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▲                                 │
│         ┌─────────────────┼─────────────────┐              │
│         │                 │                 │              │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Location   │ │Notification  │ │ Background   │        │
│  │  Service    │ │  Service     │ │  Tasks       │        │
│  ├─────────────┤ ├──────────────┤ ├──────────────┤        │
│  │ • Foreground│ │ • Sound      │ │ • Location   │        │
│  │ • Background│ │ • Vibration  │ │   Updates    │        │
│  │ • Permission│ │ • Notification
 │ │ • Dismissal  │        │
│  │   Handling  │ │ • Cleanup    │ │ • Alarm      │        │
│  └─────────────┘ └──────────────┘ │   Trigger    │        │
│                                  │ • Health     │        │
│  ┌─────────────┐ ┌──────────────┤   Check      │        │
│  │  Storage    │ │Utilities     │ │ • Restoration│        │
│  ├─────────────┤ ├──────────────┤ └──────────────┘        │
│  │ • AsyncStore│ │ • Distance   │                          │
│  │ • Trips     │ │   Calc       │                          │
│  │ • History   │ │ • Haversine  │                          │
│  │ • Settings  │ │ • Jump Detect│                          │
│  └─────────────┘ │ • ETA        │                          │
│                  └──────────────┘                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Native Module Layer (Expo)               │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  • Expo Location (GPS)                               │  │
│  │  • Expo Task Manager (Background)                    │  │
│  │  • Expo Notifications (Alarms)                       │  │
│  │  • Expo Maps (Visualization)                         │  │
│  │  • React Native Maps                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        Operating System Layer (iOS/Android)          │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  • Location Services                                 │  │
│  │  • Background Execution                             │  │
│  │  • Notifications                                     │  │
│  │  • Device Sensors                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### Trip Creation & Initialization Flow

```
User taps "Start Trip"
        │
        ▼
HomeScreen → TripSetupScreen
        │
        ├─→ Request Location Permission
        │   ├─→ Denied: Show Error
        │   └─→ Granted: Continue
        │
        ├─→ Navigate to MapScreen
        │   ├─→ Display Current Location
        │   ├─→ User selects destination
        │   └─→ Return with destination
        │
        ├─→ Configure Alarm Radius
        │   └─→ Set Sound/Vibration
        │
        ▼
useTripStore.createTrip()
        │
        ├─→ Create Trip object
        ├─→ Save to store
        ├─→ Persist to AsyncStorage
        │
        ▼
locationService.startLocationWatching()
        │
        ├─→ Foreground: watch updates
        ├─→ Background: start task
        │
        ▼
Trip Tracking Active ✓
```

### Alarm Trigger Flow

```
Background Task: Location Update (every 15s)
        │
        ├─→ Receive location from OS
        │   │
        │   └─→ Validate coordinate
        │       └─→ isValidCoordinate()
        │
        ├─→ Detect GPS Jump
        │   └─→ isLocationJump()?
        │       ├─→ YES: Ignore & Return
        │       └─→ NO: Continue
        │
        ├─→ Update Store Location
        │   └─→ store.updateCurrentLocation()
        │
        ├─→ Calculate Distance
        │   └─→ calculateDistance()
        │       └─→ Haversine Formula
        │
        ├─→ Check within Radius
        │   └─→ isWithinRadius()?
        │       ├─→ NO: Continue Loop
        │       └─→ YES: Proceed
        │
        ├─→ Check if Already Triggered
        │   └─→ trip.alarmTriggered?
        │       ├─→ YES: Return (prevent duplicate)
        │       └─→ NO: Continue
        │
        ├─→ Mark Alarm as Triggered
        │   └─→ store.triggerAlarm()
        │
        ▼
notificationService.triggerFullAlarm()
        │
        ├─→ Play Sound (if enabled)
        ├─→ Vibrate Device (if enabled)
        ├─→ Send Notification
        │
        ▼
Navigation to AlarmScreen
        │
        └─→ Display Full-Screen Alert
            ├─→ Destination Name
            ├─→ Distance Info
            └─→ Dismiss/Snooze Options
```

### State Persistence Flow

```
App Lifecycle Changes
        │
        ├─→ App Foreground
        │   └─→ Load from AsyncStorage
        │       └─→ useTripStore.restoreAppState()
        │
        ├─→ New Trip Created
        │   └─→ saveActiveTrip()
        │       └─→ AsyncStorage
        │
        ├─→ Trip Updated
        │   └─→ saveTrips()
        │       └─→ AsyncStorage (array)
        │
        ├─→ Trip Completed
        │   ├─→ saveTripHistory()
        │   ├─→ saveTrips() (updated)
        │   └─→ saveActiveTrip(null)
        │
        └─→ Settings Changed
            └─→ saveSettings()
                └─→ AsyncStorage
```

---

## 💾 Data Structure Design

### Trip Object
```typescript
{
  // Identification
  id: "uuid-string",
  
  // Destination Info
  destination: { latitude, longitude },
  destinationName: "Central Station",
  radiusMeters: 500,
  
  // Trip Lifecycle
  startTime: 1711270000000,
  endTime: undefined,
  isActive: true,
  
  // Alarm State
  alarmTriggered: false,
  alarmTriggerTime: undefined,
  
  // Real-time Data
  currentLocation: { lat, lon, accuracy, ... },
  distanceToDestination: 1500,
}
```

### Location Data
```typescript
{
  latitude: number,
  longitude: number,
  accuracy: number | null,       // meters
  altitudeAccuracy: number | null,
  altitude: number | null,
  heading: number | null,        // degrees
  speed: number | null,          // m/s
  timestamp: number,             // unix ms
}
```

### Trip History
```typescript
{
  tripId: "uuid",
  destination: { latitude, longitude },
  destinationName: "Central Station",
  radiusMeters: 500,
  startTime: 1711270000000,
  endTime: 1711273600000,
  alarmTriggered: true,
  alarmTriggerTime: 1711273500000,
}
```

---

## 🎯 Core Algorithms

### 1. Haversine Distance Formula

```typescript
const EARTH_RADIUS_METERS = 6371000;

export const calculateDistance = (from, to) => {
  // Convert to radians
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  
  // Apply Haversine formula
  const a = sin²(dLat/2) + cos(lat1) × cos(lat2) × sin²(dLon/2);
  const c = 2 × atan2(√a, √(1-a));
  
  return EARTH_RADIUS_METERS × c;
};

// Accuracy: ±0.5% on Earth's surface
// Why: Great-circle distance is most accurate for distances > 1km
```

### 2. GPS Jump Detection

```typescript
export const isLocationJump = (prev, curr, deltaSeconds, maxSpeed = 100) => {
  const distance = calculateDistance(prev, curr);
  const speed = distance / deltaSeconds;
  
  return speed > maxSpeed; // ~360 km/h
};

// Prevents false alarms from GPS "teleports"
// Typical scenario: WiFi → GPS location shift of 1km
```

### 3. Trigger with Buffer

```typescript
export const isWithinRadius = (curr, dest, radius, bufferPct = 7) => {
  const distance = calculateDistance(curr, dest);
  const effectiveRadius = radius × (1 + bufferPct / 100);
  return distance <= effectiveRadius;
};

// Why 7%? Optimal balance between:
// - Early warning (avoid GPS lag)
// - Accuracy (avoid false positives)
```

### 4. Duplicate Prevention

```typescript
// Already triggered?
if (trip.alarmTriggered) {
  return; // Skip this update
}

// Within radius?
if (isWithinRadius(location, trip.destination, trip.radius)) {
  trip.alarmTriggered = true; // Set flag FIRST
  triggerAlarm();
}

// Once per trip, guaranteed
```

---

## 📱 Screen Lifecycle

### HomeScreen
```
Mount
  ├─→ Check app state
  ├─→ Load trips
  └─→ Display active trip if exists
        │
        ├─→ Foreground: Show trip details
        ├─→ Background: Show start options
        └─→ Refresh: Manual location update
```

### TripSetupScreen
```
Mount
  ├─→ Receive destination from params
  ├─→ Initialize radius slider
  ├─→ Load user settings
        │
        └─→ On "Start Trip"
            ├─→ Validate all inputs
            ├─→ Create trip
            ├─→ Start location tracking
            └─→ Navigate to Home
```

### MapScreen
```
Mount
  ├─→ Get user location
  ├─→ Center map
  ├─→ Show current location marker
        │
        ├─→ User taps map
        │   ├─→ Create destination marker
        │   ├─→ Draw radius circle
        │   └─→ Display coordinates
        │
        └─→ User confirms
            └─→ Return with destination
```

### AlarmScreen
```
Mount (when alarmTriggered = true)
  ├─→ Animate entrance
  ├─→ Start pulsing animation
  ├─→ Display destination info
        │
        ├─→ User taps "Dismiss"
        │   └─→ Stop alarm → Navigate back
        │
        └─→ User taps "Snooze"
            └─→ Disable alarm (allow re-trigger) → Navigate back
```

---

## 🔐 Permission Handling Strategy

```
┌─ Request Foreground Location
│  ├─→ Used for: Trip setup, map interaction
│  ├─→ Required: Yes, app can't work without it
│  └─→ Fallback: Show error, no trip possible
│
├─ Request Background Location
│  ├─→ Used for: Active trip tracking
│  ├─→ Required: For alarm to work
│  ├─→ Fallback: Foreground only (limited)
│  └─→ iOS: Special permission in Settings
│
└─ Request Notifications
   ├─→ Used for: Alarm notification display
   ├─→ Required: For user-facing alert
   ├─→ Fallback: Still trigger alarm (sound only)
   └─→ Handled in App Startup
```

---

## ⚡ Performance Optimizations

### Location Throttling
```typescript
// Prevent excessive updates
requestLocationUpdates({
  timeInterval: 15000,    // 15 seconds
  distanceInterval: 10,   // 10 meters
});

// Result: ~4 updates/minute vs possible 60/minute
```

### Selective Computation
```typescript
// Only calculate distance when necessary
if (store.isTrackingActive && store.activeTrip) {
  calculateDistance(); // Skip otherwise
}
```

### Efficient State Updates
```typescript
// Use Zustand batch updates
set((state) => ({
  activeTrip: updated,
  currentLocation: newLocation,
  // All updates in single render
}));
```

### Memory Management
```typescript
// Clean up subscriptions
useEffect(() => {
  const unsubscribe = locationService.watch(...);
  return () => unsubscribe(); // Cleanup
}, []);
```

---

## 🔄 Background Task Lifecycle

```
App Launch
  │
  ├─→ restoreAppState()
  │   └─→ Load from AsyncStorage
  │
  ├─→ Check if activeTrip exists
  │   ├─→ No: Show empty state
  │   └─→ Yes: Resume tracking
  │
  └─→ startBackgroundLocationTask()
      └─→ OS starts location updates
          └─→ handleBackgroundLocationUpdate() called every 15s
              └─→ Distance check → Alarm trigger if needed
```

---

## 📊 Error Handling Strategy

```
Error Category       | Handling
─────────────────────┼──────────────────────────
Location Unavailable | Show error, disable trip
Permission Denied    | Graceful degradation
GPS Timeout         | Retry with backoff  
Task Manager Error  | Log + notify user
Notification Fail   | Fallback to sound only
Storage Failure     | Cache in memory
Invalid Coordinates | Filter & ignore
```

---

## 🎨 UI/UX Patterns

### Loading States
```
isLoadingLocation
  ├─→ On first load: Show spinner
  ├─→ During updates: Show subtle indicator
  └─→ On error: Show error message
```

### Error Presentation
```
user dismisses error
  → updateSettingsdelay 3 seconds
  → Auto-clear or manual close
```

### Animations
```
Screen Transitions: Fade/slide
Alarm Alert:       Scale + wobble
Distance Updates:  Smooth values
Button Interactions: Feedback ripple
```

---

## 📈 Future Architecture Improvements

### 1. Service Workers
```
Move heavy computations to native module
  ├─→ Distance calculation
  ├─→ Location filtering
  └─→ State synchronization
```

### 2. Microservices Backend (Optional)
```
├─→ Trip analytics service
├─→ User management
├─→ Crash reporting aggregation
└─→ Push notifications
```

### 3. Offline-First Database
```
SQLite for local storage
  ├─→ Replace AsyncStorage
  └─→ Better query capabilities
```

### 4. Custom Notifications Module
```
Replace Expo Notifications with custom
  ├─→ More control over delivery
  ├─→ Better background performance
  └─→ Custom sound handling
```

---

*Last Updated: March 2024*
*Architecture v1.0 - Production Ready*
