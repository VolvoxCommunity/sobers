# Firebase Analytics Implementation Design

> **Created:** 2025-12-05
> **Status:** Approved
> **Platform:** React Native Firebase (native) + Firebase JS SDK (web)

## Overview

Implement comprehensive analytics tracking for Sobriety Waypoint using Google Analytics 4 (GA4) via Firebase Analytics. The solution uses a unified abstraction layer that works across iOS, Android, and web platforms.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your App Code                        │
│   (components, screens, hooks, contexts)                │
└─────────────────────┬───────────────────────────────────┘
                      │ calls
                      ▼
┌─────────────────────────────────────────────────────────┐
│              lib/analytics.ts                           │
│   Unified API: trackEvent(), setUserId(),               │
│   setUserProperties(), trackScreenView()                │
└─────────────────────┬───────────────────────────────────┘
                      │ delegates to
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Native (iOS/    │    │  Web Platform    │
│  Android)        │    │                  │
│                  │    │                  │
│  @react-native-  │    │  firebase/       │
│  firebase/       │    │  analytics       │
│  analytics       │    │  (JS SDK)        │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌──────────────────────┐
         │   Google Analytics 4 │
         │   (Single Property)  │
         └──────────────────────┘
```

**Key points:**

- Single `analytics.ts` module is the only place platform detection happens
- All app code imports from `@/lib/analytics` — never directly from Firebase
- Both platforms send to the same GA4 property for unified reporting

## Analytics Module API

### Core Functions

```typescript
// Core tracking functions
trackEvent(eventName: string, params?: EventParams): void
trackScreenView(screenName: string, screenClass?: string): void

// User identity (pseudonymous)
setUserId(userId: string | null): void
setUserProperties(properties: UserProperties): void

// Lifecycle
initializeAnalytics(): Promise<void>
resetAnalytics(): Promise<void>  // For logout - clears user data
```

### Types

```typescript
interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

interface UserProperties {
  days_sober_bucket?: '0-7' | '8-30' | '31-90' | '91-180' | '181-365' | '365+';
  has_sponsor?: boolean;
  has_sponsees?: boolean;
  theme_preference?: 'light' | 'dark' | 'system';
  sign_in_method?: 'email' | 'google' | 'apple';
}
```

### Usage Example

```typescript
import { trackEvent, setUserProperties } from '@/lib/analytics';

// When user completes a task
trackEvent('task_completed', {
  task_id: task.id,
  days_since_assigned: 3,
});

// When user profile updates
setUserProperties({
  days_sober_bucket: '31-90',
  has_sponsor: true,
});
```

## Event Catalog

### Authentication Events

| Event Name     | Parameters                               | When Triggered       |
| -------------- | ---------------------------------------- | -------------------- |
| `auth_sign_up` | `method: 'email' \| 'google' \| 'apple'` | User creates account |
| `auth_login`   | `method: 'email' \| 'google' \| 'apple'` | User logs in         |
| `auth_logout`  | —                                        | User logs out        |

### Onboarding Events

| Event Name                     | Parameters                 | When Triggered                  |
| ------------------------------ | -------------------------- | ------------------------------- |
| `onboarding_started`           | —                          | User lands on onboarding screen |
| `onboarding_sobriety_date_set` | `days_sober: number`       | User sets their sobriety date   |
| `onboarding_completed`         | `duration_seconds: number` | User finishes onboarding        |

### Core Feature Engagement

| Event Name       | Parameters                  | When Triggered                |
| ---------------- | --------------------------- | ----------------------------- |
| `screen_view`    | `screen_name, screen_class` | Any screen viewed (automatic) |
| `task_viewed`    | `task_id`                   | User opens a task             |
| `task_started`   | `task_id`                   | User marks task in progress   |
| `task_completed` | `task_id, days_to_complete` | User completes a task         |
| `step_viewed`    | `step_number: 1-12`         | User views a step             |

### Milestone Events

| Event Name          | Parameters                     | When Triggered                          |
| ------------------- | ------------------------------ | --------------------------------------- |
| `milestone_reached` | `milestone_type, days_sober`   | User hits a milestone (7, 30, 90, etc.) |
| `milestone_shared`  | `milestone_type, share_method` | User shares a milestone                 |

### Social/Sponsor Features

| Event Name                | Parameters                               | When Triggered           |
| ------------------------- | ---------------------------------------- | ------------------------ |
| `sponsor_connected`       | `role: 'sponsor' \| 'sponsee'`           | Relationship established |
| `sponsor_invite_sent`     | —                                        | User sends invite code   |
| `sponsor_invite_accepted` | —                                        | Invite code used         |
| `message_sent`            | `recipient_role: 'sponsor' \| 'sponsee'` | Message sent             |

### Retention Signals

| Event Name       | Parameters             | When Triggered        |
| ---------------- | ---------------------- | --------------------- |
| `app_opened`     | `days_since_last_open` | App foregrounded      |
| `daily_check_in` | `consecutive_days`     | First open of the day |

## Integration Points

### Authentication (`contexts/AuthContext.tsx`)

```
signUp() success → trackEvent('auth_sign_up', { method })
signIn() success → trackEvent('auth_login', { method })
                 → setUserId(user.id)
                 → setUserProperties({ sign_in_method, days_sober_bucket, ... })
signOut() → trackEvent('auth_logout')
         → resetAnalytics()
```

### Onboarding (`app/onboarding.tsx`)

```
useEffect (mount) → trackEvent('onboarding_started')
setSobrietyDate() → trackEvent('onboarding_sobriety_date_set', { days_sober })
handleComplete() → trackEvent('onboarding_completed', { duration_seconds })
```

### Screen Tracking (`app/_layout.tsx`)

```
Navigation state change → trackScreenView(routeName)
(Hook into expo-router's navigation events)
```

### Tasks (`app/(tabs)/tasks.tsx`, `app/(tabs)/manage-tasks.tsx`)

```
Task press → trackEvent('task_viewed', { task_id })
Status → 'in_progress' → trackEvent('task_started', { task_id })
Status → 'completed' → trackEvent('task_completed', { task_id, days_to_complete })
```

### Steps (`app/(tabs)/steps.tsx`)

```
Step selected → trackEvent('step_viewed', { step_number })
```

### Journey/Milestones (`app/(tabs)/journey.tsx`)

```
Milestone detected → trackEvent('milestone_reached', { milestone_type, days_sober })
Share button pressed → trackEvent('milestone_shared', { milestone_type, share_method })
```

### App Lifecycle (`app/_layout.tsx`)

```
App state → 'active' → trackEvent('app_opened', { days_since_last_open })
First open of day → trackEvent('daily_check_in', { consecutive_days })
```

## Firebase Setup Requirements

### Firebase Console Setup (One-time)

1. Create new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add iOS app → Download `GoogleService-Info.plist`
3. Add Android app → Download `google-services.json`
4. Add Web app → Copy config object (apiKey, projectId, etc.)
5. Enable Google Analytics in Firebase project settings

### Project File Changes

**New files to create:**

```
lib/analytics.ts              # Unified analytics API
lib/analytics.native.ts       # React Native Firebase implementation
lib/analytics.web.ts          # Firebase JS SDK implementation
types/analytics.ts            # Shared types (EventParams, UserProperties)
```

**Configuration files to add:**

```
ios/GoogleService-Info.plist      # iOS Firebase config
android/app/google-services.json  # Android Firebase config
```

**Files to modify:**

```
app.json                      # Add Firebase plugin configuration
app/_layout.tsx               # Initialize analytics, screen tracking
contexts/AuthContext.tsx      # User ID & properties on auth state change
```

**Dependencies to install:**

```
@react-native-firebase/app       # Core Firebase (native)
@react-native-firebase/analytics # Analytics (native)
firebase                         # Web SDK
```

### Environment Variables

```env
# .env (for web SDK)
EXPO_PUBLIC_FIREBASE_API_KEY=xxx
EXPO_PUBLIC_FIREBASE_PROJECT_ID=xxx
EXPO_PUBLIC_FIREBASE_APP_ID=xxx
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Privacy & Compliance

### Data Sent to GA4

**What IS sent:**

- Pseudonymous user ID (Supabase UUID — not reversible to identity)
- Event names and parameters (no PII)
- Bucketed user properties (e.g., `days_sober_bucket: '31-90'`, not exact dates)
- Device/platform info (automatic from SDK)

**What is NOT sent:**

- Name, email, phone number
- Exact sobriety date (only bucketed ranges)
- Message content
- Specific task descriptions
- Any data that could identify the user or their recovery journey details

### Implementation Safeguards

```typescript
// lib/analytics.ts will include a sanitization layer

function sanitizeParams(params: EventParams): EventParams {
  const sanitized = { ...params };

  // Strip any accidentally included PII fields
  const piiFields = ['email', 'name', 'phone', 'first_name', 'last_name'];
  piiFields.forEach((field) => delete sanitized[field]);

  return sanitized;
}
```

### User Control (Future Enhancement)

Architecture supports adding later:

- Analytics opt-out toggle in Settings screen
- `disableAnalytics()` function in analytics module
- Respects device-level "Limit Ad Tracking" settings (automatic with Firebase)

### GA4 Data Retention

Configure in GA4 console:

- Set data retention to 2 months (minimum) or 14 months based on your needs
- Enable data deletion requests capability for GDPR/CCPA compliance

## Testing Strategy

### Debug Mode

```typescript
// lib/analytics.ts
const isDebugMode = __DEV__ || process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === 'true';

// In debug mode:
// - Events logged to console
// - GA4 DebugView enabled (shows events in real-time in Firebase console)
// - Production reports unaffected
```

### Unit Tests

```typescript
// __tests__/lib/analytics.test.ts

// Mock the underlying Firebase SDK
jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({
    logEvent: jest.fn(),
    setUserId: jest.fn(),
    setUserProperties: jest.fn(),
  }),
}));

// Test that events are formatted correctly
it('tracks task_completed with correct parameters', () => {
  trackEvent('task_completed', { task_id: '123', days_to_complete: 3 });

  expect(mockLogEvent).toHaveBeenCalledWith('task_completed', {
    task_id: '123',
    days_to_complete: 3,
  });
});

// Test PII sanitization
it('strips PII fields from event parameters', () => {
  trackEvent('test_event', { task_id: '123', email: 'user@test.com' });

  expect(mockLogEvent).toHaveBeenCalledWith('test_event', {
    task_id: '123',
    // email should be stripped
  });
});
```

### Validation Checklist

Before shipping, verify in GA4 DebugView:

- [ ] Events appear with correct names
- [ ] Parameters are attached correctly
- [ ] User ID is set after login
- [ ] User properties update correctly
- [ ] Screen views are tracked on navigation

## Summary

| Decision     | Choice                                                                    |
| ------------ | ------------------------------------------------------------------------- |
| Platform     | React Native Firebase (native) + Firebase JS SDK (web)                    |
| Events       | Comprehensive — auth, onboarding, features, milestones, social, retention |
| Firebase     | New project to be created                                                 |
| Naming       | GA4 format: `snake_case` with category prefix                             |
| Privacy      | Pseudonymous user ID + anonymized user properties                         |
| Architecture | Unified abstraction layer (`lib/analytics.ts`)                            |
