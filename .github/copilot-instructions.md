# Copilot Coding Agent Instructions — Sobers

## What This Project Is

Sobers is a cross-platform recovery/sobriety tracking app built with **Expo 55**, **React Native 0.83**, **TypeScript 5.9**, and **Supabase**. It runs on iOS, Android, and Web. File-based routing is handled by **Expo Router 55**.

## Quick Start

```bash
# Install dependencies (pnpm is the ONLY supported package manager)
pnpm install --frozen-lockfile

# Required validation — run this before every commit
pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test
```

If `pnpm` is not available, install it first:

```bash
npm install -g pnpm@10.30.3
```

### Running Individual Checks

```bash
pnpm typecheck          # TypeScript strict-mode check (tsc --noEmit)
pnpm lint               # ESLint via Expo (expo lint)
pnpm format:check       # Prettier check without writing
pnpm format             # Prettier auto-fix
pnpm test               # Jest unit tests
pnpm test -- path/to/file.test.tsx   # Single test file
pnpm test -- -t "pattern"            # Tests matching name pattern
pnpm build:web          # Expo web export (validates bundling)
```

### Known Build Environment Notes

- `pnpm install` may emit a warning about ignored build scripts for `@sentry/cli` and `unrs-resolver`. This is expected; run `pnpm approve-builds` if native Sentry CLI binaries are needed.
- Tests emit deprecation warnings for `react-test-renderer`. These are harmless and come from `@testing-library/react-native` internals.
- Node.js 22+ is used in CI. The project requires at least Node 22.

## Project Structure

```
app/                    # Expo Router file-based routes
  _layout.tsx           # Root layout — providers, auth routing, analytics
  login.tsx             # Login screen
  signup.tsx            # Signup screen
  onboarding.tsx        # Onboarding flow
  (app)/(tabs)/         # Authenticated tab screens (home, journey, program, etc.)
components/             # Reusable React components (organized by feature)
  auth/                 # OAuth buttons (Apple, Google)
  dashboard/            # Home screen cards
  navigation/           # Tab bar components
  onboarding/           # Onboarding flow
  profile/              # Profile screen
  program/              # 12-Step program content
  settings/             # Settings screen
  sheets/               # Bottom sheet modals
  tasks/                # Task management
  whats-new/            # Release notes UI
contexts/               # React Context providers (AuthContext, ThemeContext, DevToolsContext)
hooks/                  # Custom React hooks (useDaysSober, useTabBarPadding, etc.)
lib/                    # Utility modules
  supabase.ts           # Singleton Supabase client (Proxy pattern, platform-aware storage)
  logger.ts             # Centralized logging → Sentry breadcrumbs
  sentry.ts             # Sentry initialization and error capture
  analytics-utils.ts    # Amplitude analytics with PII stripping
  date.ts, format.ts    # Date/number formatting helpers
  validation.ts         # Input validation
types/
  database.ts           # Supabase-generated types (DO NOT edit manually)
  analytics.ts          # Amplitude event types
__tests__/              # Jest unit tests — mirrors source structure
__mocks__/              # Jest module mocks
e2e/                    # Playwright end-to-end tests
supabase/
  migrations/           # PostgreSQL migration files (30+)
  functions/            # Supabase Edge Functions (Deno)
  config.toml           # Local Supabase dev configuration
constants/              # App constants (colors, config)
styles/                 # Global style definitions
assets/                 # Images, icons, fonts
```

## Critical Rules

### 1. Never Use `console.log`

ESLint enforces `no-console` as an error. Use the logger instead:

```typescript
import { logger, LogCategory } from '@/lib/logger';

logger.info(LogCategory.AUTH, 'User logged in', { userId });
logger.error(LogCategory.DATABASE, 'Query failed', { error });
```

Only `lib/logger.ts`, `lib/sentry.ts`, and `jest.setup.js` are exempt.

### 2. Always Use `@/` Path Alias

All imports must use the `@/` path alias (maps to project root via tsconfig):

```typescript
// ✅ Correct
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ❌ Wrong — relative imports
import { supabase } from '../../lib/supabase';
```

### 3. Use Semantic Theme Colors

Never use raw color values or `Palette` constants in components:

```typescript
const { theme } = useTheme();
// ✅ theme.primary, theme.text, theme.background
// ❌ Palette.iosBlue, '#007AFF'
```

### 4. Context API Only — No Redux/Zustand

State management uses React Context exclusively:

- `AuthContext` — user, session, profile, loading, auth methods
- `ThemeContext` — theme object, isDark, setTheme
- `DevToolsContext` — development tools

### 5. Don't Edit Generated Types

`types/database.ts` is auto-generated from Supabase schema. Never modify it manually.

## Testing Conventions

### Test Location and Structure

Tests live in `__tests__/` and mirror the source directory structure:

```
__tests__/
  app/             # Route/screen tests
  components/      # Component tests (by feature subdirectory)
  contexts/        # Context provider tests
  hooks/           # Custom hook tests
  lib/             # Utility/library tests
  types/           # Type-level tests
  test-utils.tsx   # Shared test helpers
```

### Writing Tests

```typescript
import { renderWithProviders } from '@/__tests__/test-utils';
import { screen } from '@testing-library/react-native';

// MUST mock contexts at module level before tests
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    profile: mockProfile,
    loading: false,
    signOut: jest.fn(),
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDark: false,
    setTheme: jest.fn(),
  }),
}));

it('renders correctly', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeTruthy();
});
```

### Key Testing Facts

- Coverage threshold: **85%** statements/functions/lines, **83%** branches (see `jest.config.js`)
- Jest mocks platform as **iOS** by default (`Platform.OS = 'ios'`)
- Timezone is forced to **UTC** in `jest.setup.js`
- Supabase client is mocked with a chainable query builder in `jest.setup.js`
- AsyncStorage and SecureStore are mocked to prevent real storage operations
- Lucide icons are mocked to simple React elements

## Authentication Flow

The root layout (`app/_layout.tsx`) enforces routing based on auth state:

1. **No user** → redirects to `/login`
2. **User without complete profile** → redirects to `/onboarding`
3. **Complete profile** → renders `/(tabs)` (main app)

Profile completeness requires both a real name (not default "User U") and a `sobriety_date`.

OAuth providers: **Apple** (native Apple Sign-In) and **Google** (WebBrowser for native, redirect for web).

## Supabase Architecture

- **Client**: Singleton with Proxy-based lazy initialization to prevent SSR issues (`lib/supabase.ts`)
- **Storage**: SecureStore on native, localStorage on web
- **Edge Functions**: Deno runtime in `supabase/functions/` (e.g., `daily-reflection`)
- **Schema**: Defined by migrations in `supabase/migrations/`; types generated to `types/database.ts`
- **Key tables**: `profiles`, `sponsor_sponsee_relationships`, `tasks`, `task_completions`, `milestones`, `messages`, `notifications`, `daily_readings`

## Component Patterns

### Bottom Sheets

Always use the `GlassBottomSheet` wrapper, not raw `@gorhom/bottom-sheet`:

```typescript
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
const sheetRef = useRef<GlassBottomSheetRef>(null);
sheetRef.current?.present();
sheetRef.current?.dismiss();
```

Use `BottomSheetTextInput` (not `TextInput`) for inputs inside sheets.

### Icons

Use Lucide React Native:

```typescript
import { Heart, Plus, X } from 'lucide-react-native';
<Heart size={24} color={theme.primary} />
```

### File Organization Within a File

Follow this order in every file:

```
Imports → Types/Interfaces → Constants → Helper functions → Main component/logic → Styles
```

### Naming Conventions

- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Booleans: `is`/`has`/`should` prefix (e.g., `isLoading`, `hasSlipUps`)
- Files: Component files match component name; utility files use `kebab-case`

## CI Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push to `main` and PRs to `main`/`develop`:

1. **lint-and-typecheck** — `pnpm typecheck`, `pnpm lint`, `pnpm format:check`
2. **test** (depends on #1) — `pnpm test:ci --coverage` with Codecov upload
3. **build** (depends on #1) — `pnpm build:web` with artifact upload

The setup action (`.github/actions/setup-project/action.yml`) installs Node 22 + pnpm 10.30.3 with caching.

## Git Conventions

- **Branches**: `<type>/<description>` (e.g., `feat/add-prayer-tracker`, `fix/login-redirect`)
- **Commits**: Conventional commits — `<type>(<scope>): <description>`
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`
  - Scopes: `auth`, `journey`, `tasks`, `profile`, `supabase`, `theme`, `deps`, `config`
- **Changelog**: Only document user-facing changes in `CHANGELOG.md`

## Platform-Specific Considerations

- Google OAuth: WebBrowser on native, direct redirect on web
- Storage: SecureStore (native) vs localStorage (web)
- Deep linking scheme: `sobers://` for native OAuth callbacks
- Font loading (JetBrains Mono) must complete before hiding splash screen
- Always check `Platform.OS` when writing platform-specific code

## Sponsor/Sponsee Role System

There is no `role` field on profiles. Role is contextual, determined by relationship records:

- `sponsor_id` in a relationship → that user is the sponsor
- `sponsee_id` in a relationship → that user is the sponsee
- A user can simultaneously be a sponsor in one relationship and a sponsee in another
- Tasks flow one direction: sponsor → sponsee
- Invite codes connect sponsors to sponsees

## Error Handling

- Sentry wraps the entire app (`app/_layout.tsx`) for crash reporting
- `ErrorBoundary` component provides graceful UI fallbacks
- Privacy scrubbing in `lib/sentry-privacy.ts` strips PII automatically
- Account deletion uses the `delete_user_account` RPC function for cascading cleanup

## Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

## Common Pitfalls

1. **Missing context mocks in tests** — Every test using `renderWithProviders` must mock the contexts it depends on via `jest.mock()` at module level.
2. **Using console.log** — ESLint will error. Use `logger` from `@/lib/logger`.
3. **Editing `types/database.ts`** — This is auto-generated. Change the Supabase schema/migrations instead.
4. **Raw color values** — Always use `theme.*` from `useTheme()`.
5. **Relative imports** — Always use `@/` path alias.
6. **Metro bundler cache issues** — Run `pnpm start:clean` to clear caches.
7. **Forgetting `pnpm build:web`** — The web build can catch bundling issues that typecheck and lint miss.
