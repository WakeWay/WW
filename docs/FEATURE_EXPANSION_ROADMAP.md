# WakeWay Feature Expansion Roadmap

**Prepared:** 2026-09-19  
**Product direction:** Make WakeWay the reliable travel companion that helps people get off at the right place, even when they are tired, distracted, offline, or unfamiliar with the route.

## Product Principle

The strongest expansion path is not adding unrelated travel features. WakeWay should become better at three connected jobs:

1. **Prepare:** help users create a trip quickly and accurately.
2. **Protect:** reliably monitor the journey and alert the user at the right moment.
3. **Remember:** help users reuse, share, and improve their recurring journeys.

## Recommended Priorities

| Priority | Feature | User value | Effort | Recommendation |
|---|---|---:|---:|---|
| P0 | Reliable recurring trips | Very high | Medium | Build first after production hardening |
| P0 | Better alarm recovery and escalation | Very high | Medium | Core trust feature |
| P0 | Saved places and trip templates | High | Low | Fastest retention improvement |
| P1 | Multi-waypoint route progress | High | Medium | Completes an existing domain model |
| P1 | Transit-aware destination search | High | High | Major usability improvement |
| P1 | Live trip sharing and safety check-in | High | High | Valuable, but privacy-sensitive |
| P1 | Offline maps and offline trip setup | High | High | Important for unreliable connectivity |
| P2 | Smart ETA and battery-aware tracking | Medium | Medium | Improves quality and battery life |
| P2 | Personal travel insights | Medium | Medium | Makes history useful beyond storage |
| P2 | Accessibility modes | High | Medium | Expand reach and improve safety |
| P3 | Community stop and place data | Medium | High | Network-effect opportunity |
| P3 | Wearable and vehicle integrations | Medium | High | Expansion after mobile reliability |

## P0 Features: Strengthen the Core Promise

### 1. Reliable recurring trips

Allow users to save a trip as a reusable template, such as `Home to Office`, with:

- One or more saved waypoints.
- Default alarm radius.
- Preferred sound, vibration, and snooze settings.
- Optional scheduled departure time.
- A one-tap `Start this trip` action.

**Why it matters:** Many users repeat the same journeys. Reuse reduces setup friction and increases weekly retention.

**Existing code fit:** `TripSetupScreen`, `useTripStore`, `Waypoint`, `AppSettings`, and `HistoryScreen`.

**New data needed:** `TripTemplate` with `id`, `userId`, `name`, `waypoints`, `defaultRadiusMeters`, `createdAt`, and `updatedAt`.

### 2. Alarm recovery and escalation

Make alarm delivery resilient when the first alert is missed:

- Repeat notification and sound at configurable intervals.
- Escalate vibration intensity or notification priority.
- Show a persistent `Alarm active` state after app restart.
- Provide `I am awake`, `Snooze`, and `End trip` actions directly from the notification.
- Record whether the user acknowledged the alarm.
- Warn the user when notification permission or background location is disabled.

**Why it matters:** Alarm reliability is the product's central trust contract.

**Existing code fit:** `notificationService`, `AlarmScreen`, background task, and `Trip` alarm fields.

**Required foundation:** Make alarm state transitions atomic and idempotent before adding more escalation behavior.

### 3. Saved places and smart destination search

Let users save frequently used destinations:

- Home, work, school, gym, and custom places.
- Search by place name or address.
- Map pin correction before saving.
- Recent destinations.
- User-defined aliases such as `North entrance`.

**Why it matters:** It makes trip creation faster and reduces inaccurate map taps.

**Existing code fit:** `MapScreen`, `TripSetupScreen`, `Waypoint`, and local storage.

**Potential integrations:** A geocoding/place-search provider should be selected with clear cost, quota, privacy, and offline behavior.

### 4. User-controlled alarm profiles

Add named profiles such as:

- Quiet: notification only.
- Normal: sound and vibration.
- Heavy sleeper: repeated alarm and maximum vibration.
- Meeting: discreet vibration.

**Why it matters:** Different contexts require different alert behavior.

**Existing code fit:** `AppSettings`, `SettingsScreen`, and `notificationService`.

## P1 Features: Expand Journey Awareness

### 5. Full multi-waypoint route progress

Turn the existing waypoint array into a complete route experience:

- Show all stops in order.
- Mark each stop as upcoming, current, reached, skipped, or missed.
- Advance automatically after the user acknowledges an alarm.
- Allow a user to skip or edit a stop during the trip.
- Show progress such as `2 of 4 stops reached`.
- Complete the trip after the final waypoint.

**Why it matters:** The data model already supports multiple waypoints, but the product behavior needs to be made explicit and visible.

**Existing code fit:** `Trip.currentWaypointIndex`, `Waypoint.triggered`, `HistoryScreen`, `HomeScreen`, and alarm actions.

### 6. Transit-aware trip setup

Support public transport journeys with:

- Station and stop search.
- Route selection.
- Direction and platform details where available.
- Arrival or departure alarm modes.
- A larger radius for underground, indoor, or low-GPS areas.
- Recalculation when the user changes route.

**Why it matters:** Public transit is the clearest use case for a location alarm, especially for tired commuters.

**Dependencies:** Transit API, route data licensing, mapping provider, privacy review, and robust offline fallback.

### 7. Live trip sharing and safety check-in

Allow a user to share a temporary trip link with a trusted contact:

- Current trip status and last known location.
- Planned destination and expected arrival window.
- Automatic `Trip started`, `Near destination`, and `Trip completed` events.
- Optional timeout if the user does not acknowledge arrival.
- Immediate revoke and expiration controls.

**Why it matters:** It adds safety value for late-night travel and unfamiliar routes.

**Safety requirements:** Explicit opt-in, short-lived share tokens, precise location minimization, clear expiration, audit logging, and no continuous sharing by default.

### 8. Offline trip setup and maps

Allow users to prepare and start a trip without an active network connection:

- Saved places and templates available offline.
- Cached map tiles or a lightweight offline destination view.
- Local geocoding for saved places.
- Sync when connectivity returns.
- Clear indication when route data is stale.

**Why it matters:** Travel often happens in tunnels, rural areas, airports, or congested networks.

**Foundation required:** Versioned local storage and a durable sync outbox.

## P2 Features: Personalization and Efficiency

### 9. Smart ETA and arrival confidence

Improve the current distance-only experience with:

- ETA based on recent movement speed.
- Different estimates for walking, driving, cycling, and transit.
- Confidence indicator based on GPS accuracy and update freshness.
- `GPS signal weak` and `Location stale` states.
- Suggested radius based on recent arrival behavior.

**Why it matters:** Distance alone does not tell users whether the alarm timing is trustworthy.

**Existing code fit:** `calculateETA`, location accuracy fields, `distanceCalculator`, and active trip UI.

### 10. Battery-aware tracking

Adapt tracking based on distance, movement, battery level, and alarm radius:

- High accuracy near the destination.
- Balanced accuracy when far away.
- User-selectable battery modes.
- Battery warning before starting a long trip.
- Tracking health indicator.

**Why it matters:** Users will uninstall a location app that drains their battery.

**Existing code fit:** `updateAdaptivePolling`, `locationService`, `performHealthCheck`, and settings.

### 11. Personal travel insights

Turn history into useful summaries:

- Most common destinations.
- Average journey duration.
- Alarm success and acknowledgement rate.
- Trips where the user arrived early or late.
- Battery cost per trip.
- Weekly travel summary stored locally by default.

**Privacy rule:** Keep precise location history local unless the user explicitly enables cloud backup or sharing.

### 12. Accessibility and inclusive alert modes

Add modes for users with different hearing, vision, mobility, and attention needs:

- High-contrast alarm screen.
- Large text and simplified controls.
- Strong haptic patterns.
- Flash or screen-based alerts where platform policy permits.
- Voice announcements using text-to-speech.
- Headphone and Bluetooth audio behavior.
- One-handed controls and larger notification actions.

**Why it matters:** Accessibility directly improves alarm reliability for everyone.

## P3 Features: Larger Expansion Bets

### 13. Community-maintained places and stop corrections

Allow users to suggest corrections for:

- Station entrances.
- Bus stop coordinates.
- Platform or exit information.
- Temporary closures.
- Safer pickup/drop-off locations.

This requires moderation, abuse prevention, contribution history, and a trusted data model. It should follow proven reliability work, not precede it.

### 14. Wearable support

Add smartwatch support for:

- Countdown and distance display.
- Haptic alarm delivery.
- Dismiss and snooze actions.
- Low-power companion mode.

Start with notification actions before building a full native watch application.

### 15. Vehicle and navigation integrations

Potential integrations include:

- CarPlay and Android Auto-compatible notification experiences.
- Navigation app handoff.
- Calendar-based trip suggestions.
- Voice assistant shortcuts.
- Bluetooth headset alert routing.

These integrations require platform-specific entitlement, store-policy, and background-execution validation.

## Recommended 12-Month Sequence

### Release 1: Trust and retention

1. Secure session storage and remove insecure backend defaults.
2. Unify the auth/database model.
3. Fix alarm persistence and duplicate triggering.
4. Add saved places and recurring trip templates.
5. Add alarm recovery, notification actions, and tracking health status.
6. Test on real iOS and Android devices.

### Release 2: Better journeys

1. Implement full multi-waypoint progression.
2. Add smart ETA and GPS confidence.
3. Add battery-aware tracking modes.
4. Add offline templates and sync outbox.
5. Add accessibility alarm profiles.

### Release 3: Network value

1. Add transit-aware search and routes.
2. Add temporary trip sharing and safety check-ins.
3. Add optional cloud backup and cross-device restore.
4. Add personal travel insights with privacy controls.

### Release 4: Platform expansion

1. Add community place corrections.
2. Add wearable support.
3. Add vehicle/navigation integrations.

## Features to Avoid for Now

These ideas are less aligned with WakeWay's core value or would add significant complexity too early:

- A general-purpose social feed.
- Advertising before trust and retention are established.
- Always-on location history in the cloud.
- AI-generated travel recommendations without reliable route data.
- A full mapping/navigation replacement.
- Gamification that pressures users to share sensitive travel data.

## Feature Readiness Checklist

Before shipping any new location-dependent feature, confirm:

- The feature works when the app is backgrounded.
- Permission denial has a clear fallback.
- GPS accuracy and stale data are visible to the user.
- Offline behavior is defined.
- Battery impact is measured.
- Location collection and retention are documented.
- The feature has deterministic domain tests.
- The feature has physical-device evidence on iOS and Android.
- The feature can be disabled remotely or safely rolled back.

## Suggested First Feature to Build

Build **Saved Places + Recurring Trip Templates** first, but only alongside the alarm reliability fixes already listed in [PRODUCTION_ARCHITECTURE_REVIEW.md](PRODUCTION_ARCHITECTURE_REVIEW.md).

This gives WakeWay a practical daily-use loop:

1. Save a destination once.
2. Start a familiar trip in one tap.
3. Receive a dependable alarm.
4. Reuse the trip tomorrow.

That loop improves retention without prematurely expanding the product into a general navigation platform.
