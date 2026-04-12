# 🚀 WakeWay Deployment Guide

## Production Deployment Strategy

This guide covers deploying WakeWay to iOS App Store and Google Play Store with production-grade reliability and monitoring.

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] All linting warnings addressed (`npm run lint`)
- [ ] Test coverage > 80% (`npm run test:coverage`)
- [ ] No console.debug or TODO comments in production code
- [ ] Environment variables properly configured

### Functionality Testing
- [ ] Location tracking works in foreground
- [ ] Background location tracking works (app closed)
- [ ] Alarm triggers correctly
- [ ] Alarm triggers only once per trip
- [ ] GPS drift doesn't cause false alarms
- [ ] Permissions request flows work correctly
- [ ] App handles permission denial gracefully
- [ ] No crashes on rapid app cold starts

### Device Testing
- [ ] Tested on iOS 14+ devices
- [ ] Tested on Android 11+ devices
- [ ] Tested on low-end devices (1GB RAM)
- [ ] Tested on 2G/3G network (slow connections)
- [ ] Battery drain is acceptable
- [ ] Notification sounds work correctly

### Battery & Performance
- [ ] Background task doesn't drain battery excessively
- [ ] App memory usage stays below 150MB
- [ ] Startup time < 3 seconds
- [ ] Map transitions smooth (60 FPS)
- [ ] No memory leaks after 1 hour of continuous use

### Security & Privacy
- [ ] Privacy policy is accurate and accessible
- [ ] Location data not sent to external servers
- [ ] Trip history stored locally only
- [ ] No sensitive data in logs
- [ ] HTTPS used for all API calls
- [ ] Crash logs sanitized before sending

### Compliance
- [ ] App Store privacy questions answered
- [ ] Google Play Store data collection disclosed
- [ ] Location usage justification clear
- [ ] Terms of Service drafted
- [ ] GDPR compliance reviewed

---

## 🔧 Pre-Release Configuration

### 1. Update Version Numbers

```json
// app.json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    },
    "android": {
      "versionCode": 1
    }
  }
}
```

### 2. Configure Environment

```bash
# Create production .env
cp .env.example .env.production
```

```
# .env.production
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
EXPO_PUBLIC_ENABLE_DEBUG_MODE=false
DEBUG_LOCATION=false
DEBUG_DISTANCE=false
DEBUG_ALARMS=false
```

### 3. Production-Only Logger

Create a production logger to strip console logs:

```typescript
// src/utils/logger.ts
export const logger = {
  log: __DEV__ ? console.log : () => {},
  warn: __DEV__ ? console.warn : () => {},
  error: (error: any) => {
    // Always log errors in production for crash reporting
    console.error(error);
    // Send to Sentry
    if (!__DEV__) {
      Sentry.captureException(error);
    }
  },
};
```

---

## 📱 iOS Deployment

### Step 1: Set Up Apple Developer Account

```bash
# Install fastlane for iOS automation
sudo gem install fastlane -NV

# Initialize fastlane in project
cd ios
fastlane init
```

### Step 2: Create App on App Store Connect

1. Visit [App Store Connect](https://appstoreconnect.apple.com/)
2. Create new app:
   - Name: `WakeWay`
   - Bundle ID: `com.yourcompany.wakeway`
   - SKU: `WAKEWAY-001`
3. Fill in all required information:
   - Description
   - Screenshots (6-8 for each device size)
   - Keywords
   - Support URL
   - Privacy Policy URL

### Step 3: Configure App in Expo

```json
// app.json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.wakeway",
      "supportsTabletMode": true,
      "requireFullScreen": false,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "WakeWay needs your location to alert you when you're near your destination",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "WakeWay needs continuous location access to track your journey",
        "UIBackgroundModes": ["location"],
        "NSNotificationPermissionUsageDescription": "We'll send you an alert when you're close to your stop"
      }
    }
  }
}
```

### Step 4: Build & Submit

```bash
# Option A: Using EAS (Recommended)
npm install -g eas-cli

# Link to Expo account
eas build:configure

# Build for App Store
eas build --platform ios --release-channel production

# Submit to App Store
eas submit --platform ios --latest
```

```bash
# Option B: Manual build
# Generate local credentials
expo build:ios

# Follow prompts to configure signing
# Build size: ~70-90 MB
```

### Step 5: Review on App Store Connect

1. Select build in App Store Connect
2. Fill in app review information:
   - Demo account (if needed)
   - Testing notes: "Background location tracking test: Start trip, minimize app, move to destination. Alarm should trigger."
   - Contact information
3. Submit for review

---

## 🤖 Android Deployment

### Step 1: Google Play Developer Account

1. Create [Google Play Developer](https://play.google.com/apps/publish/) account
2. Pay $25 registration fee
3. Complete merchant profile

### Step 2: Create App in Google Play Console

1. Create new app:
   - Name: `WakeWay`
   - Content Type: `Application`
   - Category: `Travel`
   - Default Language: `English`

2. Configure app details:
   - Short description (80 chars)
   - Full description
   - Screenshots (5-8+ for different devices)
   - Feature graphic (1024x500)
   - Video (promotional)

### Step 3: Configure App in Expo

```json
// app.json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.wakeway",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "POST_NOTIFICATIONS"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### Step 4: Generate Signing Key

```bash
# Android App Signing Configuration
# Option A: Let Google Play handle signing (recommended)
# Option B: Manual signing

keytool -genkey -v -keystore ~/wakeway-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias wakeway-key

# Store credentials securely (never commit to git)
```

### Step 5: Build & Submit

```bash
# Using EAS
eas build --platform android --release-channel production

# Submit
eas submit --platform android --latest
```

### Step 6: Google Play Console Review

1. Create release:
   - Track: `Internal Testing` → `Closed Testing` → `Production`
   - Select built APK
   - Release notes: "Initial release"

2. Set up store listing:
   - Content rating
   - Privacy policy
   - Target audience
   - Permissions justification

3. Submit for review
   - Typically 1-4 hours for approval
   - May require multiple submissions for feedback

---

## 🔐 Security Hardening

### Code Obfuscation (Android)

```json
// app.json
{
  "plugins": [
    [
      "expo-build-properties",
      {
        "android": {
          "enableProguardInReleaseBuilds": true
        }
      }
    ]
  ]
}
```

### Certificate Pinning

```typescript
// src/services/apiService.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  httpsAgent: {
    // Pin specific certificates
    rejectUnauthorized: true,
  },
});
```

### Secure Storage

```typescript
// For sensitive data (API keys, tokens)
import * as SecureStore from 'expo-secure-store';

// Store
await SecureStore.setItemAsync('api_token', token);

// Retrieve
const token = await SecureStore.getItemAsync('api_token');
```

---

## 📊 Monitoring & Analytics

### Set Up Crash Reporting

```bash
npm install @sentry/react-native
eas secrets create
```

```typescript
// src/services/errorReporting.ts
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT,
  tracesSampleRate: 1.0,
});

// Wrap app
Sentry.withProfiler(App);
```

### Analytics Setup

```typescript
// src/services/analytics.ts
import { Analytics } from '@react-native-firebase/analytics';

export const logEvent = (name: string, params?: Record<string, any>) => {
  if (process.env.EXPO_PUBLIC_ENABLE_ANALYTICS) {
    Analytics().logEvent(name, params);
  }
};

// Track important events
logEvent('trip_started', {
  radius: trip.radiusMeters,
  destination: trip.destinationName,
});

logEvent('alarm_triggered', {
  destinationName: trip.destinationName,
  distanceAtTrigger: distance,
});
```

---

## 🔄 Update Strategy

### Version Bumping

```bash
# Semantic versioning
# Major.Minor.Patch (1.0.0)

# Patch: Bug fixes, minor changes
# Minor: New features, backward compatible
# Major: Breaking changes

npm version patch    # 1.0.0 → 1.0.1
npm version minor    # 1.0.0 → 1.1.0
npm version major    # 1.0.0 → 2.0.0
```

### Over-The-Air (OTA) Updates

```bash
# Using EAS Updates (for JS code only)
eas update --branch production --message "Bug fixes"

# Users get updates automatically on next app launch
```

### Rollout Strategy

- **Phase 1**: Internal testing (1-5%)
- **Phase 2**: Limited rollout (10-25%)
- **Phase 3**: Staged rollout (50%)
- **Phase 4**: Full release (100%)

---

## 🐛 Post-Release Monitoring

### Key Metrics to Monitor

```typescript
// Track these metrics
- Crash rate (target: < 0.1%)
- ANR rate (Android, target: < 0.5%)
- Average session length
- Daily Active Users (DAU)
- 7-day retention
- Alarm trigger success rate
- Battery drain rate
```

### Alerting Thresholds

```
🔴 CRITICAL:
- Crash rate > 1%
- App doesn't launch
- Location not updating

🟡 WARNING:
- Crash rate > 0.5%
- Alarm not triggering > 5% of time
- Average session < 2 minutes

🟢 HEALTHY:
- Crash rate < 0.1%
- 90%+ alarm success rate
- 2+ hour average sessions
```

---

## 📋 Maintenance & Support

### Regular Tasks

```bash
# Weekly
- Monitor crash reports
- Check user feedback
- Review analytics

# Monthly
- Dependency updates
- Security patches
- Performance profiling

# Quarterly
- Major version planning
- User research
- Feature prioritization
```

### Support Email Template

```
Subject: WakeWay App Issue

Thanks for reaching out!

We're sorry you're experiencing an issue. To help you better, please provide:

1. Device: iPhone/Android model
2. OS Version: iOS 14+ / Android 11+
3. App Version: (found in Settings)
4. Issue Description: What happened?
5. Steps to Reproduce: How to repeat the issue?
6. Screenshots: Any relevant images?

Please feel free to reply with these details.

Best regards,
WakeWay Support Team
```

---

## 🆘 Rollback Procedure

### If Critical Bug Discovered

```bash
# 1. Immediate steps
- Pull build from app stores (if possible)
- Post-incident update to users

# 2. Fix bug
git checkout main
git pull origin main
# Fix code
npm test
npm run type-check

# 3. Create hotfix branch
git checkout -b hotfix/1.0.1

# 4. Build and deploy
eas build --platform ios,android --release-channel hotfix
eas submit --platform ios,android --latest

# 5. Merge back to main
git merge hotfix/1.0.1
git push origin main

# 6. Communication
# Notify users of fix via:
# - App notification
# - Email
# - Support channels
```

---

## 📞 Post-Launch Communication

### Release Notes Template

**WakeWay v1.0.0**

🎉 **Initial Release**

✨ **Features**
- Location-based alarm system
- Real-time trip tracking
- Background location support
- Trip history

🐛 **Fixes**
- N/A for initial release

📈 **Performance**
- Optimized battery usage
- Smooth map interactions

---

## ✅ Deployment Success Criteria

✓ App published on both app stores
✓ > 100 downloads in first week
✓ Average rating > 4.0 stars
✓ Crash rate < 0.1%
✓ Alarm functionality verified by users
✓ No critical bugs reported
✓ Support emails being responded to promptly
✓ Analytics dashboard set up and monitoring
✓ Crash reporting alerts configured

---

## 📚 Resources

- [EAS Deployment](https://docs.expo.dev/eas/)
- [React Native Debugging](https://reactnative.dev/docs/debugging)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)
- [Sentry Documentation](https://docs.sentry.io/platforms/react-native/)

---

*Last Updated: March 2024*
