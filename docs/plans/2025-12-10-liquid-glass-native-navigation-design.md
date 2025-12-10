# Liquid Glass Native Navigation Design

## Overview

Transform Sobriety Waypoint into a native-first app with iOS 26 Liquid Glass aesthetics, Android Material You adaptation, and strict Airbnb code standards — while maintaining web support via top navigation.

## Goals

1. **iOS 26 Liquid Glass aesthetic** — Translucent tab bar, headers, and bottom sheets with system blur
2. **Native performance** — Replace JS-based navigation with native components for 60fps animations
3. **Android adaptive styling** — Material You design language with elevation and dynamic color
4. **Web top navigation** — Horizontal nav bar for desktop/web users
5. **Airbnb strict code standards** — Consistent, maintainable codebase

## Dependencies

### New Dependencies

| Package                            | Purpose                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `react-native-bottom-tabs`         | Native iOS `UITabBarController` with system blur              |
| `react-native-keyboard-controller` | Replaces `KeyboardAvoidingView` with native keyboard handling |
| `@gorhom/bottom-sheet`             | Native gesture-driven sheets with blur backdrop               |
| `expo-blur`                        | `BlurView` for headers, modals, custom glass surfaces         |
| `eslint-config-airbnb-extended`    | Strict JavaScript/TypeScript/React linting (flat config)      |

### Removed Dependencies

| Package              | Reason                                      |
| -------------------- | ------------------------------------------- |
| `eslint-config-expo` | Replaced by `eslint-config-airbnb-extended` |

### Removed Components

| Component           | Reason                                 |
| ------------------- | -------------------------------------- |
| `AnimatedBottomNav` | Replaced by `react-native-bottom-tabs` |

## Architecture

### Navigation Architecture

#### Tab Bar (iOS)

- `react-native-bottom-tabs` with `UITabBarController`
- Native system blur via `tabBarStyle: { translucent: true }`
- SF Symbols for icons: `house.fill`, `book.fill`, `chart.line.uptrend.xyaxis`, `checklist`, `person.fill`
- Haptic feedback on tab press (native default)

#### Tab Bar (Android)

- `react-native-bottom-tabs` with Material-styled appearance
- Subtle elevation + surface tint (Material You adaptive)
- Lucide icons: `Home`, `BookOpen`, `TrendingUp`, `CheckSquare`, `User`
- No blur (performance concerns on many Android devices)

#### Tab Bar (Web)

- Top horizontal navigation bar using `Platform.select`
- Simple styled `View` with `Pressable` items
- Positioned at top of screen, standard web UX pattern
- Lucide icons consistent with Android

#### Native Headers

- All 5 tab screens get `headerShown: true` with native headers
- iOS: Large titles enabled, blur on scroll (`headerTransparent: true` + `headerBlurEffect: 'systemMaterial'`)
- Android: Standard Material app bar with elevation
- Modals/Sheets: Custom headers as needed

```typescript
// Tab screen configuration
screenOptions={{
  headerShown: true,
  headerLargeTitle: true, // iOS only
  headerTransparent: Platform.OS === 'ios',
  headerBlurEffect: 'systemMaterial', // iOS only
}}
```

### Keyboard Handling

Replace React Native's `KeyboardAvoidingView` with `react-native-keyboard-controller`:

| Current                               | New                                                |
| ------------------------------------- | -------------------------------------------------- |
| `KeyboardAvoidingView`                | `KeyboardAwareScrollView` (for scrollable content) |
| `KeyboardAvoidingView` + `ScrollView` | `KeyboardAwareScrollView` (consolidated)           |
| Modal `KeyboardAvoidingView`          | `KeyboardAvoidingView` from keyboard-controller    |

**Files to Update:**

1. `app/_layout.tsx` — Add `KeyboardProvider`
2. `app/onboarding.tsx` — Replace with `KeyboardAwareScrollView`
3. `app/signup.tsx` — Replace with `KeyboardAwareScrollView`
4. `app/(tabs)/profile.tsx` — Replace both instances
5. `app/(tabs)/tasks.tsx` — Replace modal keyboard handling
6. `components/TaskCreationModal.tsx` — Replace modal keyboard handling

### Bottom Sheets & Modals (Liquid Glass)

Convert all modals to `@gorhom/bottom-sheet` with Liquid Glass styling:

| Use Case             | Snap Points | Notes                              |
| -------------------- | ----------- | ---------------------------------- |
| Task creation        | 60%, 90%    | Expandable for longer descriptions |
| Task details/editing | 50%, 80%    | View/edit task                     |
| Filter/sort options  | 30%         | Quick selection                    |
| Settings screen      | 90%         | Full settings, drag-to-dismiss     |
| Log slip-up          | 50%, 70%    | Date picker + optional notes       |
| Steps content        | 70%, 95%    | Reading step details, scrollable   |
| Display name edit    | 40%         | Simple text input + save           |

**Preserved as Native Alerts:**

- Confirmation dialogs (use `Alert` for native system alerts)

**Liquid Glass Configuration:**

```typescript
// iOS: Full blur backdrop
<BottomSheet
  backdropComponent={(props) => (
    <BlurView intensity={20} tint="dark" {...props} />
  )}
  backgroundStyle={{
    backgroundColor: Platform.OS === 'ios'
      ? 'rgba(255,255,255,0.7)'
      : theme.surface,
  }}
  handleIndicatorStyle={{
    backgroundColor: Platform.OS === 'ios'
      ? 'rgba(0,0,0,0.3)'
      : theme.textSecondary,
  }}
/>
```

### ESLint Configuration (Airbnb Extended)

**New Flat Config (`eslint.config.js`):**

```javascript
import airbnbExtended from 'eslint-config-airbnb-extended';

export default [
  ...airbnbExtended.configs.react,
  ...airbnbExtended.configs.typescript,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Expo/RN compatibility overrides
      'react/react-in-jsx-scope': 'off',
      'import/prefer-default-export': 'off',
      'react/jsx-props-no-spreading': [
        'error',
        {
          exceptions: ['BottomSheet', 'BlurView', 'TextInput'],
        },
      ],
      'import/extensions': [
        'error',
        'never',
        {
          json: 'always',
        },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },
];
```

## File Structure

### New Files

```
components/
├── GlassBottomSheet.tsx        # Reusable Liquid Glass bottom sheet wrapper
├── navigation/
│   ├── WebTopNav.tsx           # Top navigation bar for web platform
│   └── TabBarIcon.tsx          # SF Symbol (iOS) / Lucide (Android) switcher
└── sheets/
    ├── SettingsSheet.tsx       # Settings content for bottom sheet
    ├── LogSlipUpSheet.tsx      # Slip-up logging form
    ├── StepContentSheet.tsx    # Step detail reading view
    └── EditDisplayNameSheet.tsx # Display name editor
```

### Files to Delete

```
components/
└── AnimatedBottomNav.tsx       # Replaced by react-native-bottom-tabs

__tests__/components/
└── AnimatedBottomNav.test.tsx  # (if exists)
```

### Files to Refactor

| File                               | Changes                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `app/_layout.tsx`                  | Add `KeyboardProvider`, `BottomSheetModalProvider`, remove Settings modal config |
| `app/(tabs)/_layout.tsx`           | Replace custom tab bar with `react-native-bottom-tabs`, add web platform check   |
| `app/(tabs)/profile.tsx`           | Replace modals with sheet triggers, update keyboard handling                     |
| `app/(tabs)/tasks.tsx`             | Replace modals with sheets, update keyboard handling                             |
| `app/(tabs)/steps.tsx`             | Add sheet trigger for step content                                               |
| `app/settings.tsx`                 | Convert to sheet content component                                               |
| `app/onboarding.tsx`               | Update keyboard handling                                                         |
| `app/signup.tsx`                   | Update keyboard handling                                                         |
| `components/TaskCreationModal.tsx` | Convert to `TaskCreationSheet.tsx`                                               |

### ESLint Migration

| Old                        | New                              |
| -------------------------- | -------------------------------- |
| `.eslintrc.js` (if exists) | `eslint.config.js` (flat config) |

## Testing Strategy

### New Test Files

```
__tests__/
├── components/
│   ├── GlassBottomSheet.test.tsx
│   ├── navigation/
│   │   ├── WebTopNav.test.tsx
│   │   └── TabBarIcon.test.tsx
│   └── sheets/
│       ├── SettingsSheet.test.tsx
│       ├── LogSlipUpSheet.test.tsx
│       ├── StepContentSheet.test.tsx
│       └── EditDisplayNameSheet.test.tsx
```

### Mock Updates (`jest.setup.js`)

```javascript
// react-native-bottom-tabs mock
jest.mock('react-native-bottom-tabs', () => ({
  createNativeBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// @gorhom/bottom-sheet mock
jest.mock('@gorhom/bottom-sheet', () => ({
  __esModule: true,
  default: ({ children }) => children,
  BottomSheetModal: ({ children }) => children,
  BottomSheetModalProvider: ({ children }) => children,
  BottomSheetView: ({ children }) => children,
  BottomSheetScrollView: ({ children }) => children,
}));

// expo-blur mock
jest.mock('expo-blur', () => ({
  BlurView: ({ children }) => children,
}));

// react-native-keyboard-controller mock
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardProvider: ({ children }) => children,
  KeyboardAwareScrollView: ({ children }) => children,
  KeyboardAvoidingView: ({ children }) => children,
}));
```

### Test Utilities

- Add `BottomSheetModalProvider` to `renderWithProviders`
- Add `KeyboardProvider` wrapper
- Maintain 80% coverage minimum

## Implementation Order

| Phase                    | Tasks                                                                                   | Risk Level |
| ------------------------ | --------------------------------------------------------------------------------------- | ---------- |
| **1. Foundation**        | Install dependencies, set up providers (`KeyboardProvider`, `BottomSheetModalProvider`) | Low        |
| **2. ESLint Migration**  | Switch to `eslint-config-airbnb-extended`, fix lint errors                              | Medium     |
| **3. Tab Navigation**    | Replace `AnimatedBottomNav` with `react-native-bottom-tabs`, add web top nav            | Medium     |
| **4. Keyboard Handling** | Replace all `KeyboardAvoidingView` with `react-native-keyboard-controller`              | Low        |
| **5. GlassBottomSheet**  | Create reusable wrapper component with tests                                            | Low        |
| **6. Sheet Migrations**  | Convert modals: TaskCreation → Settings → LogSlipUp → Steps → DisplayName               | Medium     |
| **7. Native Headers**    | Enable native headers on tab screens with Liquid Glass blur                             | Low        |
| **8. Polish**            | Platform-specific refinements, final testing                                            | Low        |

## Risk Mitigation

| Risk                                     | Mitigation                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `react-native-bottom-tabs` compatibility | Verify Expo SDK 54 support before starting; fallback to `@react-navigation/bottom-tabs`    |
| ESLint fix volume (~100-200 errors)      | Batch by category (imports, types, props) rather than file-by-file                         |
| Bottom sheet gesture conflicts           | Test with keyboard controller early; `@gorhom/bottom-sheet` has built-in keyboard handling |
| Native rebuild required                  | Plan for `expo prebuild` and iOS/Android rebuilds                                          |

## Rollback Points

- **After Phase 2:** ESLint can be reverted independently
- **After Phase 3:** Navigation can be reverted to `AnimatedBottomNav` if critical issues
- **Phase 6:** Each sheet migration is independent — can ship incrementally

## Platform Behavior Summary

| Feature       | iOS                                | Android            | Web             |
| ------------- | ---------------------------------- | ------------------ | --------------- |
| Tab Bar       | Native `UITabBarController` + blur | Native + elevation | Top nav bar     |
| Tab Icons     | SF Symbols                         | Lucide             | Lucide          |
| Headers       | Large title + blur                 | Material app bar   | Standard        |
| Bottom Sheets | Blur backdrop + glass              | Elevated surface   | Standard modal  |
| Keyboard      | Native animations                  | Native animations  | Browser default |
