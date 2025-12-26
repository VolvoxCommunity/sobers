# Amplitude Analytics Migration Design

**Date:** 2025-12-26
**Status:** Approved
**Goal:** Replace Firebase Analytics with Amplitude for better product analytics, cost efficiency, and developer experience.

## Overview

Clean swap from Firebase Analytics to Amplitude using the official `@amplitude/analytics-react-native` SDK. Adopts Amplitude naming conventions (Title Case) and adds comprehensive event tracking across all user journeys.

## Architecture

### SDK & Dependencies

**Add:**

- `@amplitude/analytics-react-native` - Official SDK for iOS/Android/Web

**Remove:**

- `@react-native-firebase/analytics`
- `@react-native-firebase/app`
- `firebase`
- `plugins/withFirebaseConfig.js`
- `plugins/withModularHeaders.js`
- `firebase.json`
- Firebase config references in `app.config.ts`

**Keep:**

- `@vercel/analytics` - Separate, web-only for Vercel dashboard

### File Structure

```
lib/analytics/
├── index.ts              # Public API (same interface)
├── platform.native.ts    # Amplitude React Native SDK
├── platform.web.ts       # Amplitude Browser SDK
types/
├── analytics.ts          # Event types, user properties
```

### Configuration

```env
EXPO_PUBLIC_AMPLITUDE_API_KEY=xxx   # Single key for all platforms
```

## Event Taxonomy

**Naming Convention:** Title Case (Amplitude standard)

### Migrated Events (20 existing)

| Old (Firebase)                 | New (Amplitude)                |
| ------------------------------ | ------------------------------ |
| `auth_sign_up`                 | `Auth Sign Up`                 |
| `auth_login`                   | `Auth Login`                   |
| `auth_logout`                  | `Auth Logout`                  |
| `onboarding_started`           | `Onboarding Started`           |
| `onboarding_step_completed`    | `Onboarding Step Completed`    |
| `onboarding_sobriety_date_set` | `Onboarding Sobriety Date Set` |
| `onboarding_completed`         | `Onboarding Completed`         |
| `screen_view`                  | `Screen Viewed`                |
| `task_viewed`                  | `Task Viewed`                  |
| `task_started`                 | `Task Started`                 |
| `task_completed`               | `Task Completed`               |
| `step_viewed`                  | `Step Viewed`                  |
| `milestone_reached`            | `Milestone Reached`            |
| `milestone_shared`             | `Milestone Shared`             |
| `sponsor_connected`            | `Sponsor Connected`            |
| `sponsor_invite_sent`          | `Sponsor Invite Sent`          |
| `sponsor_invite_accepted`      | `Sponsor Invite Accepted`      |
| `message_sent`                 | `Message Sent`                 |
| `app_opened`                   | `App Opened`                   |
| `daily_check_in`               | `Daily Check In`               |

### New Events (15 additions)

| Category       | Events                                                                           |
| -------------- | -------------------------------------------------------------------------------- |
| **Onboarding** | `Onboarding Screen Viewed`, `Onboarding Field Completed`, `Onboarding Abandoned` |
| **Tasks**      | `Task Created`, `Task Skipped`, `Task Streak Updated`                            |
| **Steps**      | `Step Started`, `Step Progress Saved`, `Step Completed`                          |
| **Milestones** | `Milestone Celebrated`                                                           |
| **Social**     | `Sponsee Added`, `Message Read`                                                  |
| **Engagement** | `App Backgrounded`, `App Session Started`                                        |
| **Settings**   | `Settings Changed`                                                               |
| **Savings**    | `Savings Goal Set`, `Savings Updated`                                            |

**Total: 35 events**

## User Properties

### Migrated Properties (5)

| Property            | Type                                                          | Purpose                          |
| ------------------- | ------------------------------------------------------------- | -------------------------------- |
| `days_sober_bucket` | `0-7` \| `8-30` \| `31-90` \| `91-180` \| `181-365` \| `365+` | Privacy-safe sobriety cohorts    |
| `has_sponsor`       | boolean                                                       | Filter users with mentor support |
| `has_sponsees`      | boolean                                                       | Filter users who mentor others   |
| `theme_preference`  | `light` \| `dark` \| `system`                                 | UX preference analysis           |
| `sign_in_method`    | `email` \| `google` \| `apple`                                | Auth method breakdown            |

### New Properties (4)

| Property                | Type                                      | Purpose                        |
| ----------------------- | ----------------------------------------- | ------------------------------ |
| `onboarding_completed`  | boolean                                   | Segment completed vs abandoned |
| `task_streak_current`   | number                                    | Engagement level               |
| `steps_completed_count` | `0` \| `1-3` \| `4-6` \| `7-9` \| `10-12` | 12-step progress cohorts       |
| `savings_goal_set`      | boolean                                   | Feature adoption tracking      |

### Amplitude Auto-Properties (free)

- Device type, OS, platform
- Country, region, city
- Session count, first seen, last seen
- App version

## Public API

Unchanged signatures - internal implementation only:

```typescript
initializeAnalytics(): Promise<void>
trackEvent(eventName: string, params?: EventParams): void
setUserId(userId: string | null): void
setUserProperties(properties: UserProperties): void
trackScreenView(screenName: string, screenClass?: string): void
resetAnalytics(): Promise<void>
```

### Updated Types

```typescript
// Config simplified
export interface AnalyticsConfig {
  apiKey: string;
}

// Events with Title Case values
export const AnalyticsEvents = {
  AUTH_SIGN_UP: 'Auth Sign Up',
  AUTH_LOGIN: 'Auth Login',
  // ... all 35 events
} as const;

// Extended user properties
export interface UserProperties {
  days_sober_bucket?: DaysSoberBucket;
  has_sponsor?: boolean;
  has_sponsees?: boolean;
  theme_preference?: 'light' | 'dark' | 'system';
  sign_in_method?: 'email' | 'google' | 'apple';
  onboarding_completed?: boolean;
  task_streak_current?: number;
  steps_completed_count?: '0' | '1-3' | '4-6' | '7-9' | '10-12';
  savings_goal_set?: boolean;
}
```

## Implementation Scope

### Files to Delete (5)

- `plugins/withFirebaseConfig.js`
- `plugins/withModularHeaders.js`
- `firebase.json`
- `__tests__/plugins/withFirebaseConfig.test.ts`
- `__tests__/plugins/withModularHeaders.test.ts`

### Files to Modify (9)

| File                               | Changes                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `package.json`                     | Remove Firebase deps, add Amplitude                  |
| `app.config.ts`                    | Remove Firebase plugins & config                     |
| `.env.example`                     | Replace Firebase vars with Amplitude                 |
| `types/analytics.ts`               | New events, updated config type, new user properties |
| `lib/analytics/index.ts`           | Update config handling for single API key            |
| `lib/analytics/platform.native.ts` | Rewrite for Amplitude SDK                            |
| `lib/analytics/platform.web.ts`    | Rewrite for Amplitude SDK                            |
| `lib/analytics-utils.ts`           | Simplify (remove Firebase-specific logic)            |
| `app/_layout.tsx`                  | Update initialization (minor)                        |

### Test Files to Update (6)

- `__tests__/lib/analytics.test.ts`
- `__tests__/lib/analytics.native.test.ts`
- `__tests__/lib/analytics.web.test.ts`
- `__tests__/lib/analytics.platform.test.ts`
- `__tests__/lib/analytics-utils.test.ts`
- `__tests__/types/analytics.test.ts`

### New Event Instrumentation

Add `trackEvent()` calls to existing screens/components for the 15 new events.

## Success Criteria

1. All Firebase dependencies removed
2. Amplitude SDK initialized and tracking on iOS, Android, and Web
3. All 35 events firing correctly
4. User properties persisting across sessions
5. All tests passing with 80%+ coverage
6. No TypeScript errors
