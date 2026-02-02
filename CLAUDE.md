# CLAUDE.md - Sobers (Recovery App)

## Quick Reference

```bash
# Development
pnpm dev                          # Start dev server + Supabase
pnpm web | ios | android          # Platform-specific
pnpm start:clean                  # Clear Metro cache

# Quality (run before commit)
pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test

# Testing
pnpm test                         # All tests (80% coverage required)
pnpm test -- path/to/file.test.ts # Single file
pnpm test -- -t "pattern"         # By name
pnpm test:e2e                     # Playwright e2e tests
```

## Code Quality Requirements

**After ANY code change:**

1. Write/update tests (TDD: RED → GREEN → REFACTOR)
2. Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test`
3. Visual verification for UI changes
4. Update CHANGELOG.md for user-facing changes only
5. Commit with conventional commits: `<type>(<scope>): <description>`

## Changelog

**Only document user-facing changes** - features, bug fixes users notice, deprecations, security fixes.

**Skip:** refactors, tests, CI/CD, docs, dependency updates, tooling changes.

## Architecture

**Stack:** Expo 54 + React Native 0.81 + Expo Router 6 + Supabase + TypeScript 5.9

**Routing:** File-based in `app/`

- `app/_layout.tsx` - Root layout, auth flow
- `app/(app)/(tabs)/` - Main tab screens
- Unauthenticated → `/login` → Onboarding → `/(tabs)`

**State:** Context API only

- `AuthContext` - Authentication state
- `ThemeContext` - Light/dark mode
- `DevToolsContext` - Development tools

**Data:** `lib/supabase.ts` client, types in `types/database.ts`

**Logging:** Use `logger` from `@/lib/logger` - never `console.log`

**Analytics:** Amplitude with automatic PII stripping (see `lib/analytics-utils.ts`)

**Error Tracking:** Sentry with privacy hooks (see `lib/sentry.ts`)

## Sentry

```typescript
import { captureSentryException, setSentryUser, setSentryContext } from '@/lib/sentry';

// Set user on login
setSentryUser(userId);

// Add context to events
setSentryContext('feature', { name: 'tasks', action: 'create' });

// Capture exceptions manually
captureSentryException(error, { additionalContext: 'value' });
```

**Note:** Sentry is initialized in `app/_layout.tsx`. Privacy hooks strip PII automatically.

## Theming

Use semantic colors from `ThemeContext`, never raw `Palette` colors:

```typescript
const { theme } = useTheme();
// ✅ theme.primary, theme.text, theme.background
// ❌ Palette.iosBlue, '#007AFF'
```

**Font:** JetBrains Mono (Regular, Medium, SemiBold, Bold)

## Bottom Sheets

Use `GlassBottomSheet` wrapper (not raw `@gorhom/bottom-sheet`):

```typescript
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';

const sheetRef = useRef<GlassBottomSheetRef>(null);

// Open/close
sheetRef.current?.present();
sheetRef.current?.dismiss();

<GlassBottomSheet
  ref={sheetRef}
  snapPoints={['50%', '90%']}
  onDismiss={() => {}}
  keyboardBehavior="interactive"  // For sheets with inputs
>
  <BottomSheetScrollView>
    {/* Content */}
  </BottomSheetScrollView>
</GlassBottomSheet>
```

**Note:** Use `BottomSheetTextInput` for inputs inside sheets, not regular `TextInput`.

## Keyboard Handling

**For screens (login, signup, onboarding):**

```typescript
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={styles.container}
>
  <ScrollView contentContainerStyle={styles.scrollContent}>
    {/* Form content */}
  </ScrollView>
</KeyboardAvoidingView>
```

**For complex forms (onboarding):**

```typescript
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

<KeyboardAwareScrollView>
  {/* Form with many inputs */}
</KeyboardAwareScrollView>
```

**Note:** `KeyboardProvider` wraps the app in `_layout.tsx`.

## Icons (Lucide)

```typescript
import { Heart, Eye, EyeOff, Plus, X } from 'lucide-react-native';

<Heart size={24} color={theme.primary} />
<Heart size={24} color={theme.primary} fill={theme.primary} />  // Filled
```

Browse icons: https://lucide.dev/icons

## Component Organization

```
components/
├── auth/           # Authentication (AppleSignInButton, SocialLogos)
├── dashboard/      # Home screen cards
├── navigation/     # Tab bar, nav components
├── onboarding/     # Onboarding flow
├── profile/        # Profile screen components
├── settings/       # Settings content
├── sheets/         # Bottom sheets (EditDisplayNameSheet, etc.)
├── tasks/          # Task-related (TaskCard, TaskFilters)
└── whats-new/      # Release notes UI
```

## Custom Hooks

| Hook                | Purpose                            |
| ------------------- | ---------------------------------- |
| `useDaysSober`      | Calculate days since sobriety date |
| `useTabBarPadding`  | Safe area padding for tab bar      |
| `useFrameworkReady` | Expo framework initialization      |

## Supabase Schema

| Table                           | Purpose                         |
| ------------------------------- | ------------------------------- |
| `profiles`                      | User data, sobriety_date, prefs |
| `sponsor_sponsee_relationships` | Mentor connections              |
| `tasks` / `task_completions`    | Recovery work items             |
| `milestones`                    | Sobriety tracking               |
| `messages` / `notifications`    | Communication                   |

## Testing

- Tests in `__tests__/` mirroring source structure
- Use `renderWithProviders()` from `__tests__/test-utils.tsx`
- Mocks configured in `jest.setup.js`
- E2E tests with Playwright in `e2e/`

## Types

| File                 | Purpose                               |
| -------------------- | ------------------------------------- |
| `types/database.ts`  | Supabase generated types (don't edit) |
| `types/analytics.ts` | Amplitude event types                 |

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxx
EXPO_TOKEN=xxx                    # EAS builds
EXPO_PUBLIC_SENTRY_DSN=xxx        # Production
```

## Git Workflow

**Branches:** `<type>/<description>` (feat/, fix/, refactor/, etc.)

**Commits:** `<type>(<scope>): <description>`

- Scopes: auth, journey, tasks, profile, supabase, theme, deps, config

**Never:** Force push to main/develop, skip quality checks, commit .env

## Release Checklist

1. `git status` - verify clean working tree
2. `pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test`
3. Move CHANGELOG `[Unreleased]` entries to new version section
4. Bump version in `package.json` and `app.config.ts`
5. Commit, tag, push: `git add -A && git commit -m "vX.Y.Z" && git tag vX.Y.Z && git push origin HEAD --tags`
6. Create PR with changelog entries

## Common Pitfalls

1. Wrap test components with `renderWithProviders`
2. Use `@/` path alias for imports
3. Types from `types/database.ts` - don't edit generated types
4. Platform-specific code needs `Platform.OS` checks
5. Metro issues → `pnpm start:clean`
6. Use logger, not console (ESLint enforces)

## File Organization

```typescript
// Imports → Types → Constants → Helpers → Component → Styles
import { ... } from '@/...';
interface Props { ... }
const CONSTANT = ...;
function helper() { ... }
export default function Component() { ... }
const styles = StyleSheet.create({ ... });
```

**Naming:** Components=PascalCase, functions=camelCase, constants=SCREAMING_SNAKE_CASE, booleans=is/has prefix
