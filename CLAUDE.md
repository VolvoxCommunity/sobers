# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start Development Server:**

```bash
pnpm dev              # Start Expo dev server for all platforms
pnpm ios              # Launch in iOS simulator (macOS only)
pnpm android          # Launch in Android emulator/device
pnpm web              # Launch web version
pnpm start:clean      # Start with cleared cache (when debugging Metro issues)
```

**Quality Checks (run before committing):**

```bash
pnpm typecheck        # TypeScript type checking (required before push)
pnpm lint             # ESLint validation
pnpm format           # Auto-format with Prettier
pnpm format:check     # Check formatting without modifying
```

**Testing:**

```bash
pnpm test                     # Run all Jest tests
pnpm test:watch              # Run tests in watch mode
pnpm test -- --coverage      # Run tests with coverage report (80% minimum required)
pnpm maestro                 # Run all Maestro E2E flows
pnpm maestro:record          # Record new Maestro flow
```

**Build & Deploy:**

```bash
pnpm build:web        # Build static web bundle → dist/
pnpm clean:metro      # Clear Metro bundler cache
pnpm clean:all        # Nuclear option: clear everything and reinstall
```

**Testing a Single Test File:**

```bash
pnpm test -- path/to/test-file.test.tsx         # Run specific test file
pnpm test:watch -- path/to/test-file.test.tsx   # Watch mode for specific file
```

**Running a Single Test Suite/Case:**

```bash
pnpm test -- -t "test name pattern"             # Run tests matching pattern
```

## Code Quality Requirements

**MANDATORY**: After changing or editing any files, you MUST follow this workflow:

1. **Formatting**: Run `pnpm format` to ensure consistent code formatting
2. **Linting**: Run `pnpm lint` to check for code quality issues
3. **Type Checking**: Run `pnpm typecheck` to verify TypeScript types
4. **Build**: Run `pnpm build` to verify compilation passes
5. **Testing**: Run `pnpm test` to verify all tests pass
6. **Commit and Push**: After all checks pass, commit and push all changes

These checks are not optional. All five validation steps must pass before committing. If any check fails, fix the issues and re-run all checks before proceeding.

**Complete Workflow:**

```bash
# Step 1-5: Run all validation checks
pnpm format && pnpm lint && pnpm typecheck && pnpm build && pnpm test

# Step 6: If all checks pass, commit and push
git add .
git commit -m "your commit message"
git push
```

**Important:**

- Do NOT commit if any validation check fails
- Do NOT skip the validation checks to save time
- Always push after committing (unless explicitly told not to)

**Why this matters:**

- Prevents TypeScript errors from reaching production
- Maintains consistent code style across the project
- Catches potential bugs and issues early
- Ensures CI/CD pipeline will pass
- Keeps remote repository in sync with local changes

## Architecture

### Core Architecture Patterns

**Routing & Navigation:**

- Expo Router v6 with typed routes (file-based routing in `app/`)
- Authentication flow enforced in root layout (`app/_layout.tsx`):
  1. Unauthenticated → `/login` or `/signup`
  2. Authenticated without profile → `/onboarding`
  3. Fully onboarded → `/(tabs)` (main app)
- Route groups: `(tabs)/` contains the authenticated tab-based navigation
- Deep linking: `sobrietywaypoint://` scheme

**State Management:**

- Context API for global state (AuthContext, ThemeContext)
- No Redux/Zustand - contexts wrap the entire app in `app/_layout.tsx`
- AuthContext provides: `user`, `session`, `profile`, `loading`, auth methods
- ThemeContext provides: `theme`, `isDark`, `setTheme` (light/dark/system)

**Data Layer:**

- Supabase client (`lib/supabase.ts`) with typed database schema (`types/database.ts`)
- Platform-aware storage: SecureStore (native) / localStorage (web)
- Database types are canonical - all data models derive from `types/database.ts`
- No local schema migrations - Supabase migrations are source of truth

**Authentication:**

- Supabase Auth with multiple providers:
  - Email/password (ready)
  - Google OAuth (configured)
  - Apple Sign In (design phase, see `docs/plans/`)
- Session persistence via secure storage adapter
- Auto-refresh tokens enabled
- Root layout guards routes based on auth state

### Project Structure

```
app/
├── _layout.tsx              # Root layout with auth guards + provider wrapping
├── login.tsx                # Email/password + social sign in
├── signup.tsx               # Registration flow
├── onboarding.tsx           # Profile setup (name, role, sobriety date)
├── +not-found.tsx           # 404 handler
└── (tabs)/                  # Authenticated tab navigation
    ├── _layout.tsx          # Tab bar configuration
    ├── index.tsx            # Dashboard/home
    ├── tasks.tsx            # Task list for sponsees
    ├── manage-tasks.tsx     # Task assignment for sponsors
    ├── journey.tsx          # Timeline/milestone view
    ├── steps.tsx            # 12-step program content
    └── profile.tsx          # User profile + settings

components/                  # Shared UI components
contexts/                    # Global state providers
├── AuthContext.tsx          # User session, profile, auth methods
└── ThemeContext.tsx         # Theme switching (light/dark/system)

lib/
├── supabase.ts              # Configured Supabase client + storage adapter
├── sentry.ts                # Centralized Sentry initialization
├── sentry-privacy.ts        # PII scrubbing rules
└── validation.ts            # Shared validation logic

types/
└── database.ts              # TypeScript types for Supabase schema (Profile, Task, etc.)

hooks/                       # Custom React hooks
styles/                      # Shared theme constants
```

### Important Implementation Details

**Path Aliases:**

- All imports use `@/` prefix (configured in tsconfig.json)
- Example: `import { supabase } from '@/lib/supabase'`

**Authentication Guard Pattern:**
The root layout (`app/_layout.tsx`) orchestrates the auth flow:

- Reads `user`, `profile`, `loading` from AuthContext
- Routes users based on state:
  - No user → `/login`
  - User but no profile → `/onboarding`
  - User + incomplete profile (no sobriety_date) → `/onboarding`
  - User + complete profile → `/(tabs)`
- This pattern prevents unauthorized access and ensures complete onboarding

**Supabase Integration:**

- All database operations use typed client: `supabase.from('profiles').select()...`
- Row Level Security (RLS) policies enforce data access (managed in Supabase dashboard)
- Real-time subscriptions available via `supabase.channel().on(...)`
- Auth state change listener in AuthContext syncs session with React state

**Theme System:**

- ThemeContext manages light/dark/system modes
- System mode respects OS preference via `useColorScheme()`
- Theme persists across sessions (stored in SecureStore/localStorage)
- Components consume theme via `useTheme()` hook

**Error Handling:**

- Sentry SDK wraps root component for crash reporting
- Production-only error tracking (disabled in `__DEV__`)
- Privacy scrubbing configured in `lib/sentry-privacy.ts`
- ErrorBoundary component wraps app for graceful failures

**Font Loading:**

- JetBrains Mono loaded via expo-font
- Splash screen hidden after fonts load (`useEffect` in `_layout.tsx`)
- Font variants: Regular, Medium, SemiBold, Bold

## Testing Strategy

**Coverage Requirements:**

- 80% minimum across statements, branches, functions, and lines
- Enforced in CI/CD pipeline

**Testing Layers:**

1. Unit tests: Pure functions, utilities, hooks
2. Integration tests: Component + context interactions
3. E2E tests: Maestro flows for critical user journeys

**Testing Patterns:**

- Use `renderWithProviders` from `test-utils/` to wrap components with AuthContext, ThemeContext
- MSW (Mock Service Worker) for API mocking in `mocks/`
- Test fixtures in `test-utils/fixtures/`
- Templates for new tests in `docs/templates/`

## Supabase Schema Overview

**Core Tables:**

- `profiles`: User profiles (name, role, sobriety_date, preferences)
- `sponsor_sponsee_relationships`: Links between sponsors/sponsees
- `invite_codes`: Codes for connecting sponsors with sponsees
- `tasks`: Assigned recovery work items
- `task_completions`: Task completion records with notes
- `steps`: 12-step program content
- `messages`: Direct messaging between users
- `milestones`: Sobriety milestone tracking
- `notifications`: In-app notification queue

**Key Types:**

- `UserRole`: 'sponsor' | 'sponsee' | 'both'
- `RelationshipStatus`: 'pending' | 'active' | 'inactive'
- `TaskStatus`: 'assigned' | 'in_progress' | 'completed'
- All types defined in `types/database.ts`

## Environment Configuration

**Required Variables:**

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_TOKEN=xxx                      # For EAS builds
```

**Production-Only:**

```env
EXPO_PUBLIC_SENTRY_DSN=xxx
SENTRY_AUTH_TOKEN=xxx
SENTRY_ORG=volvox
SENTRY_PROJECT=sobriety-waypoint
```

**Naming Convention:**

- `EXPO_PUBLIC_*` = Available in client-side code
- Other vars = Build-time only (NOT in app code)

## CI/CD Pipeline

**GitHub Actions (`.github/workflows/ci.yml`):**

1. Lint → Format check → Typecheck
2. Web build (artifact retention: 7 days)
3. Android + iOS preview builds via EAS
4. Claude Code Review (sticky PR comments)

**EAS Build Profiles:**

- `development`: Dev client for local testing
- `preview`: CI builds with Release config, OTA channel `preview`
- `production`: Production builds with auto version bump

**Required GitHub Secrets:**

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_TOKEN` (from expo.dev → Access Tokens)

## MCP Server Usage

When using MCP servers (Model Context Protocol):

- **expo-mcp**: For Expo-specific operations (library installation, docs search)
  - Use `search_documentation` for Expo API questions
  - Use `add_library` to install Expo packages correctly
- **serena**: For symbolic code navigation and editing
  - Prefer symbolic tools over reading entire files
  - Use `get_symbols_overview` before reading file contents
  - Use `find_symbol` for targeted code reading
- **brave-search**: For up-to-date web information
  - Use when needing current package versions, API changes
  - Helpful for researching React Native/Expo ecosystem changes

## Code Style & Conventions

**TypeScript:**

- Strict mode enabled (`strict: true` in tsconfig)
- Prefer explicit types over inference for public APIs
- Use database types from `types/database.ts` as source of truth

**Imports:**

- Use `@/` path alias for all local imports
- Group imports: React → third-party → local (Prettier enforces)

**Components:**

- Functional components with hooks (no class components)
- Props interfaces defined inline or exported if shared
- StyleSheet.create() for component styles (no inline objects)

**Git Workflow:**

- Husky + lint-staged auto-format on commit
- Pre-commit checks: Prettier format + ESLint on staged TS/JS files
- Skip hooks only via `git commit -n` (not recommended)

**Branch Naming (Conventional Branch):**

Use [Conventional Branch](https://conventional-branch.github.io/) naming format:

```
<type>/<description>
```

Types:

- `feat/` - New feature (e.g., `feat/user-authentication`)
- `fix/` - Bug fix (e.g., `fix/login-validation-error`)
- `docs/` - Documentation only (e.g., `docs/api-readme`)
- `style/` - Code style/formatting (e.g., `style/prettier-config`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-context`)
- `test/` - Adding/updating tests (e.g., `test/journey-screen`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)
- `perf/` - Performance improvements (e.g., `perf/optimize-queries`)
- `ci/` - CI/CD changes (e.g., `ci/github-actions`)

Examples:

- `feat/dual-metrics-journey`
- `fix/supabase-ssr-compatibility`
- `refactor/theme-context-hooks`
- `chore/bump-expo-sdk`

**Commit Messages (Conventional Commits):**

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format with **required scope**:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types (same as branch naming):

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style/formatting (not CSS)
- `refactor` - Code refactoring
- `test` - Adding/updating tests
- `chore` - Maintenance tasks
- `perf` - Performance improvements
- `ci` - CI/CD changes

Common scopes for this project:

- `auth` - Authentication (login, signup, session)
- `journey` - Journey/timeline screen
- `tasks` - Task management
- `steps` - 12-step content
- `profile` - User profile
- `supabase` - Database/Supabase client
- `theme` - Theming system
- `deps` - Dependencies
- `config` - Configuration files

Examples:

```
feat(journey): add dual metrics display for slip-ups
fix(supabase): make client SSR-compatible for static builds
refactor(auth): simplify session refresh logic
test(journey): add coverage for timeline events
chore(deps): bump expo-router to v6.0.15
docs(readme): update setup instructions
```

Breaking changes use `!` after scope:

```
feat(auth)!: migrate to new session storage format
```

## Common Pitfalls

1. **Don't bypass auth guards** - always test routes with different auth states
2. **Don't commit .env** - use `.env.example` as template
3. **Don't skip typecheck** - CI will fail without it
4. **Don't read Supabase env vars after build** - `EXPO_PUBLIC_*` only
5. **Don't forget to wrap test components** - use `renderWithProviders`
6. **Don't edit generated types** - update Supabase schema instead
7. **Don't use `any` without good reason** - strict mode is enforced
8. **Platform-specific code requires Platform.OS checks** - especially storage, auth flows
9. **Metro cache issues** - run `pnpm start:clean` when imports break mysteriously
10. **Sentry is production-only** - errors in dev won't appear in Sentry dashboard
