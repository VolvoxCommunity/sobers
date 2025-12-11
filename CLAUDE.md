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
pnpm test:ci                 # Run tests with coverage in CI mode (used by GitHub Actions)
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

1. **Add/Update Tests**: Write tests for any new or modified code (see Testing Strategy section)
2. **Formatting**: Run `pnpm format` to ensure consistent code formatting
3. **Linting**: Run `pnpm lint` to check for code quality issues
4. **Type Checking**: Run `pnpm typecheck` to verify TypeScript types
5. **Build**: Run `pnpm build:web` to verify compilation passes
6. **Testing**: Run `pnpm test` to verify all tests pass and coverage stays above 80%

These checks are not optional. All six validation steps must pass before the user commits. If any check fails, fix the issues and re-run all checks before proceeding.

**Test-Driven Development (TDD) - REQUIRED:**

You MUST use TDD for ALL code changes. This is not optional. The TDD cycle is:

1. **RED** - Write a failing test first
2. **GREEN** - Write the minimum code to make the test pass
3. **REFACTOR** - Clean up the code while keeping tests green

**TDD Workflow:**

```bash
# 1. Write the test FIRST (it should fail)
pnpm test -- path/to/new-feature.test.ts
# Expected: Test fails (RED)

# 2. Write the implementation
# ... make code changes ...

# 3. Run the test again (it should pass)
pnpm test -- path/to/new-feature.test.ts
# Expected: Test passes (GREEN)

# 4. Refactor if needed, keeping tests green
pnpm test -- path/to/new-feature.test.ts
# Expected: Test still passes (REFACTOR)

# 5. Run full test suite to check for regressions
pnpm test
```

**What Requires Tests:**

| Change Type      | Test Requirement                                   |
| ---------------- | -------------------------------------------------- |
| New feature      | Tests for happy path, edge cases, error handling   |
| Bug fix          | Regression test that would have caught the bug     |
| Refactoring      | Existing tests must pass; add tests if gaps found  |
| New component    | Rendering, props, user interactions, state changes |
| New hook         | Return values, state updates, side effects         |
| New utility      | All code paths, edge cases, error conditions       |
| API integration  | Mock external calls, test success/error scenarios  |
| Deletion/removal | Update or remove related tests                     |
| UI changes       | Snapshot tests or interaction tests                |

**TDD Anti-Patterns to AVOID:**

- Writing code first and tests after (defeats the purpose)
- Writing tests that always pass (tests must fail first)
- Testing implementation details instead of behavior
- Skipping tests "because it's a small change"
- Mocking everything (test real behavior when possible)
- Writing tests without assertions

**Complete Workflow:**

```bash
# Run all validation checks
pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test
```

**Important:**

- Do NOT skip the validation checks to save time
- All validation checks must pass before changes are considered complete
- Only push once everything is validated and commited

**Commit Workflow (for Claude Code):**

When completing multiple tasks in a session:

1. **Commit after each completed task** - Create an atomic commit once a task passes all validation checks
2. **Use Conventional Commits** - Format: `<type>(<scope>): <description>` (see Git Workflow section)
3. **Keep commits atomic** - One feature, fix, or change per commit
4. **Only push after ALL tasks are complete** - Do not push until the entire session's work is finished
5. **Verify before pushing** - Ensure all commits are ready and all tasks pass validation

Example workflow for multiple tasks:

```bash
# Task 1 complete - commit immediately
git add . && git commit -m "feat(auth): add password reset flow"

# Task 2 complete - commit immediately
git add . && git commit -m "fix(profile): handle null avatar gracefully"

# Task 3 complete - commit immediately
git add . && git commit -m "test(auth): add coverage for password reset"

# ALL tasks complete - now push
git push
```

**Visual Verification (CRITICAL):**

Before committing ANY UI or functional changes, you MUST verify them visually:

1. **Start the web dev server**: Run `pnpm web` to launch the development server
2. **Use Chrome DevTools MCP**: Use the `chrome-devtools` MCP tools to interact with and verify the running app
3. **Test the changes**: Navigate to affected screens and verify the changes work correctly
4. **Check for regressions**: Ensure existing functionality still works as expected

**Chrome DevTools MCP Workflow:**

```bash
# 1. Start the dev server (in background or separate terminal)
pnpm web

# 2. Use Chrome DevTools MCP to:
#    - Navigate to pages (navigate_page)
#    - Take snapshots (take_snapshot) to see page structure
#    - Take screenshots (take_screenshot) to verify visual appearance
#    - Click elements (click) to test interactions
#    - Fill forms (fill) to test inputs
#    - Check console for errors (list_console_messages)
#    - Verify network requests (list_network_requests)
```

**Verification Checklist:**

For every change, verify the following as applicable:

- [ ] **Page loads without errors** - No console errors, no white screen
- [ ] **Layout renders correctly** - Elements positioned as expected, no overflow issues
- [ ] **Text is readable** - Correct fonts, sizes, colors, contrast
- [ ] **Interactive elements work** - Buttons clickable, forms submittable, links navigate
- [ ] **State updates correctly** - UI reflects data changes, loading states show/hide
- [ ] **Error states display** - Invalid inputs show errors, failed requests show messages
- [ ] **Responsive behavior** - Use `resize_page` to test different viewport sizes
- [ ] **Theme compatibility** - Test in both light and dark modes if applicable
- [ ] **Accessibility** - Elements have proper labels (check snapshot for accessible names)
- [ ] **Navigation flows** - Back/forward buttons work, deep links resolve correctly
- [ ] **Data persistence** - Changes save to Supabase, refresh preserves state
- [ ] **Loading states** - Spinners/skeletons show during async operations
- [ ] **Empty states** - UI handles zero-data scenarios gracefully
- [ ] **Edge cases** - Very long text, special characters, boundary values

**Network & API Verification:**

Always verify API interactions for data-related changes:

1. **Check request payload** - Use `get_network_request` to verify correct data is sent
2. **Verify response handling** - Ensure success/error responses update UI correctly
3. **Test offline behavior** - Use `emulate` with `networkConditions: "Offline"` to test graceful degradation
4. **Check for race conditions** - Rapid clicking shouldn't cause duplicate requests
5. **Verify auth headers** - Authenticated requests include proper tokens

```bash
# Example: Verify a form submission
1. Fill form: mcp__chrome-devtools__fill_form
2. Submit: mcp__chrome-devtools__click (submit button)
3. Check network: mcp__chrome-devtools__list_network_requests (resourceTypes: ["fetch", "xhr"])
4. Get request details: mcp__chrome-devtools__get_network_request (reqid from step 3)
5. Verify payload and response are correct
```

**Console Error Severity:**

Not all console messages are equal - know what to look for:

| Level      | Action Required                                        |
| ---------- | ------------------------------------------------------ |
| `error`    | **MUST FIX** - Indicates broken functionality          |
| `warn`     | **SHOULD FIX** - May indicate potential issues         |
| `log/info` | Review if unexpected - May indicate debug code left in |

Filter console messages by type:

```bash
mcp__chrome-devtools__list_console_messages (types: ["error", "warn"])
```

**Performance Testing:**

For changes that may impact performance, use Chrome DevTools performance tracing:

```bash
# Start a performance trace with page reload
mcp__chrome-devtools__performance_start_trace (reload: true, autoStop: true)

# Or manually control the trace
mcp__chrome-devtools__performance_start_trace (reload: false, autoStop: false)
# ... perform actions ...
mcp__chrome-devtools__performance_stop_trace

# Analyze specific insights
mcp__chrome-devtools__performance_analyze_insight (insightSetId: "...", insightName: "LCPBreakdown")
```

**Performance Checklist:**

- [ ] **Initial load time** - Page renders meaningful content within 2-3 seconds
- [ ] **Largest Contentful Paint (LCP)** - Main content visible quickly
- [ ] **Time to Interactive (TTI)** - Page responds to input promptly
- [ ] **No layout shifts** - Content doesn't jump around during load
- [ ] **Efficient re-renders** - State changes don't cause excessive re-renders
- [ ] **Network waterfall** - No blocking requests, parallel fetches where possible
- [ ] **Bundle size** - New dependencies don't significantly increase bundle

**When to performance test:**

- Adding new dependencies/libraries
- Implementing list views with many items
- Adding images or media
- Creating complex animations
- Fetching large datasets

**Form Validation Edge Cases:**

Test forms with unexpected inputs to ensure robust validation:

**Email Fields:**

```bash
# Test these values with mcp__chrome-devtools__fill
- ""                           # Empty
- "notanemail"                 # Missing @
- "@nodomain.com"              # Missing local part
- "spaces in@email.com"        # Spaces
- "valid@email.com"            # Valid (should pass)
- "a@b.c"                      # Minimal valid
- "very.long.email.address.that.exceeds.normal.length@extremely-long-domain-name.com"
```

**Password Fields:**

```bash
- ""                           # Empty
- "short"                      # Too short
- "nouppercaseornumbers"       # Missing requirements
- "ValidP@ssw0rd!"             # Valid (should pass)
- "a]P1" + "x".repeat(1000)    # Extremely long
- "<script>alert(1)</script>"  # XSS attempt (should be escaped)
```

**Text/Name Fields:**

```bash
- ""                           # Empty
- "   "                        # Only whitespace
- "A"                          # Single character
- "José María"                 # Unicode/accents
- "李明"                        # Non-Latin characters
- "O'Brien-Smith"              # Apostrophes and hyphens
- "<script>alert(1)</script>"  # XSS attempt
- "x".repeat(10000)            # Extremely long input
```

**Date Fields:**

```bash
- ""                           # Empty
- "2099-12-31"                 # Far future
- "1900-01-01"                 # Far past
- "2024-02-30"                 # Invalid date
- Today's date                 # Boundary
- Tomorrow                     # Future (may be invalid for sobriety_date)
```

**Form Validation Checklist:**

- [ ] **Required fields show errors when empty** - Clear error messages appear
- [ ] **Invalid formats rejected** - Email, date, etc. validate format
- [ ] **Error messages are helpful** - Tell user what's wrong and how to fix
- [ ] **Errors clear when corrected** - Message disappears after valid input
- [ ] **Submit disabled until valid** - Or shows all errors on attempt
- [ ] **Server errors handled** - Network failures, duplicate entries, etc.
- [ ] **XSS inputs escaped** - Script tags render as text, not executed
- [ ] **SQL injection prevented** - Special characters don't break queries (Supabase RLS helps)

**Testing Authentication Flows:**

Since this app has auth guards, test these scenarios:

1. **Unauthenticated state** - Verify redirect to `/login`
2. **Authenticated without profile** - Verify redirect to `/onboarding`
3. **Fully authenticated** - Verify access to `/(tabs)` screens
4. **Session expiry** - Verify graceful handling of expired tokens

**Common Issues to Watch For:**

| Issue                  | How to Detect                    | Chrome DevTools Tool                                |
| ---------------------- | -------------------------------- | --------------------------------------------------- |
| JavaScript errors      | Red errors in console            | `list_console_messages`                             |
| Failed API calls       | 4xx/5xx responses                | `list_network_requests`, `get_network_request`      |
| Missing elements       | Element not in snapshot          | `take_snapshot`                                     |
| Visual regressions     | Screenshot differs from expected | `take_screenshot`                                   |
| Broken interactions    | Click does nothing               | `click` + `take_snapshot`                           |
| Form validation issues | Submit doesn't work              | `fill` + `click`                                    |
| Performance problems   | Slow load times                  | `performance_start_trace`, `performance_stop_trace` |
| Layout breakage        | Elements overlapping/hidden      | `take_screenshot` at different sizes                |

**Step-by-Step Example:**

```
# Example: Verifying a new button on the profile screen

1. Start dev server: pnpm web
2. List pages: mcp__chrome-devtools__list_pages
3. Navigate: mcp__chrome-devtools__navigate_page (url: "http://localhost:8081/profile")
4. Wait for load: mcp__chrome-devtools__wait_for (text: "Profile")
5. Take snapshot: mcp__chrome-devtools__take_snapshot
6. Verify button exists in snapshot with correct uid
7. Click button: mcp__chrome-devtools__click (uid: "button-uid")
8. Take screenshot: mcp__chrome-devtools__take_screenshot
9. Check console: mcp__chrome-devtools__list_console_messages
10. Verify no errors and expected behavior occurred
```

**When to Skip Visual Verification:**

Only skip visual verification for changes that have NO runtime impact:

- Documentation-only changes (README, CLAUDE.md, comments)
- Type-only changes (interfaces, type definitions with no runtime code)
- Test-only changes (test files that don't affect production code)
- Configuration changes that don't affect the UI (ESLint rules, tsconfig)

**For ALL other changes, visual verification is MANDATORY.**

**Why this matters:**

- Static analysis (typecheck, lint) cannot catch runtime or visual bugs
- UI changes may look correct in code but render incorrectly
- User interactions may have unexpected side effects
- Console errors or network issues only appear at runtime
- This is the final safety check before committing
- Prevents TypeScript errors from reaching production
- Maintains consistent code style across the project
- Catches potential bugs and issues early
- Ensures CI/CD pipeline will pass

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
  - Apple Sign In (see `docs/APPLE_SIGNIN_SETUP.md`)
- Session persistence via secure storage adapter
- Auto-refresh tokens enabled
- Root layout guards routes based on auth state

### Project Structure

```
app/
├── _layout.tsx              # Root layout with auth guards + provider wrapping
├── login.tsx                # Email/password + social sign in
├── signup.tsx               # Registration flow
├── onboarding.tsx           # Profile setup (name, sobriety date)
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
├── logger.ts                # Universal logging with Sentry breadcrumbs
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
- Error tracking enabled in all environments (development/preview/production)
- Environment tags help filter errors in Sentry dashboard
- Privacy scrubbing configured in `lib/sentry-privacy.ts`
- ErrorBoundary component wraps app for graceful failures

**Logging:**

- Universal logger (`lib/logger.ts`) provides centralized, structured logging
- All logs sent to Sentry as breadcrumbs and console (development only)
- **NEVER use console.log/error/warn directly** - use logger instead
- ESLint enforces no-console rule (exceptions: logger.ts, sentry.ts, jest.setup.js)
- Five log levels: `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`, `logger.trace()`
- Categorize logs with `LogCategory` enum (AUTH, DATABASE, UI, STORAGE, etc.)
- Always pass Error objects to `logger.error()` for stack traces
- Include contextual metadata for better debugging in Sentry
- Privacy scrubbing via existing `beforeBreadcrumb` hook in `lib/sentry-privacy.ts`
- See `docs/logger.md` for complete API reference and best practices

**Font Loading:**

- JetBrains Mono loaded via expo-font
- Splash screen hidden after fonts load (`useEffect` in `_layout.tsx`)
- Font variants: Regular, Medium, SemiBold, Bold

## Testing Strategy

**Coverage Requirements:**

- 80% minimum across statements, branches, functions, and lines
- Enforced in CI/CD pipeline

**MANDATORY: Tests Required for All Code Changes:**

Every code change MUST include corresponding tests. This applies to:

- **New features** - Add tests covering the happy path, edge cases, and error handling
- **Bug fixes** - Add a regression test that would have caught the bug
- **Modifications** - Update existing tests to reflect changes, add new tests for new behavior
- **Refactoring** - Ensure existing tests still pass; add tests if coverage gaps are discovered
- **New components** - Test rendering, user interactions, props, and state changes
- **New hooks** - Test return values, state updates, and side effects
- **New utilities/helpers** - Test all code paths, edge cases, and error conditions
- **API integrations** - Mock external calls and test success/error scenarios

**Test File Location:**

- Tests go in `__tests__/` directory mirroring the source structure
- Example: `app/(tabs)/profile.tsx` → `__tests__/app/profile.test.tsx`
- Example: `hooks/useDaysSober.ts` → `__tests__/hooks/useDaysSober.test.ts`

**Testing Layers:**

1. Unit tests: Pure functions, utilities, hooks
2. Integration tests: Component + context interactions
3. E2E tests: Maestro flows for critical user journeys

**Testing Patterns:**

- Use Jest with React Native Testing Library
- MSW (Mock Service Worker) for API mocking
- Wrap components with AuthContext, ThemeContext in tests
- Mock Supabase client for database operations
- Mock navigation with expo-router mocks

**Test Quality Standards:**

- Tests should be independent and not rely on execution order
- Use descriptive test names: `it('shows error message when email is invalid')`
- Group related tests with `describe()` blocks
- Clean up mocks in `beforeEach()` or `afterEach()`
- Avoid testing implementation details; test behavior instead

**Jest Configuration (`jest.config.js`):**

- Test environment: `node` (not jsdom - faster for React Native)
- Coverage thresholds: 80% global (statements, branches, functions, lines)
- Test patterns: `**/__tests__/**/*.(spec|test).[jt]s?(x)`

**Mock Strategy (`jest.setup.js`):**

Comprehensive mocks are configured for:

- **React Native**: Core components, Animated, Platform
- **Expo modules**: Router, Font, SplashScreen, AuthSession, WebBrowser, Linking
- **Supabase**: Auth and database client
- **Sentry**: Error tracking
- **AsyncStorage**: Secure storage
- **Firebase**: Analytics

**Test Utilities Location:** `__tests__/test-utils.tsx`

- Exports `renderWithProviders()` wrapper for components needing context
- Pre-configured AuthContext and ThemeContext mocks

## Supabase Schema Overview

**Core Tables:**

- `profiles`: User profiles (name, sobriety_date, preferences) - NO role field
- `sponsor_sponsee_relationships`: Links between users in mentor relationships
- `invite_codes`: Codes for connecting sponsors with sponsees
- `tasks`: Assigned recovery work items (sponsor assigns to sponsee)
- `task_completions`: Task completion records with notes
- `steps`: 12-step program content
- `messages`: Direct messaging between users
- `milestones`: Sobriety milestone tracking
- `notifications`: In-app notification queue

**Key Concepts:**

- **No Role Restrictions**: Users can be both sponsors (helping others) and sponsees (being helped) in different relationships
- **Role is Contextual**: Role is determined by relationship - who is `sponsor_id` vs `sponsee_id` in the relationship
- **Task Direction**: Tasks flow from sponsor → sponsee (unidirectional within a relationship)

**Key Types:**

- `RelationshipStatus`: 'pending' | 'active' | 'inactive'
- `TaskStatus`: 'assigned' | 'in_progress' | 'completed'
- `NotificationType`: 'task_assigned' | 'milestone' | 'message' | 'connection_request' | 'task_completed'
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

## Advanced Expo Configuration

**Experimental Features Enabled (`app.config.ts`):**

- `experiments.reactCompiler: true` - React Compiler for automatic memoization
- `experiments.typedRoutes: true` - Type-safe routing with Expo Router
- `newArchEnabled: true` - React Native New Architecture

**EAS Update Configuration:**

- Runtime version policy: `"appVersion"` - Updates tied to app version
- Update check on launch: Enabled
- Fallback to cache timeout: 0ms (immediate)

**Firebase Integration:**

Firebase configuration uses a two-tier strategy:

1. **EAS Builds**: Uses EAS secrets (`GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICES_PLIST`)
2. **Local Development**: Falls back to local files (`google-services.json`, `GoogleService-Info.plist`)

**Build Tools:**

- **Babel** (`babel.config.js`): Uses `babel-preset-expo` (standard Expo preset)
- **Metro** (`metro.config.js`): Wrapped with Sentry for source map uploads

## CI/CD Pipeline

**GitHub Actions:**

1. **CI Pipeline** (`.github/workflows/ci.yml`):
   - Lint → Format check → Typecheck
   - Web build (artifact retention: 7 days)
   - Android + iOS preview builds via EAS

2. **Claude Code Review** (`.github/workflows/claude-code-review.yml`):
   - Automatic code review on PR open/sync
   - Commits fixes for simple issues directly to PR branch
   - Updates sticky comment with comprehensive feedback

3. **Auto Label** (`.github/workflows/auto-label.yml`):
   - Automatically labels PRs and issues using Claude AI
   - Analyzes content, changed files, and description
   - Applies 2-5 relevant labels (type, area, priority)
   - Runs on PR/issue open, reopen, or edit

4. **Daily Codebase Review** (`.github/workflows/daily-codebase-review.yml`):
   - Runs daily on schedule or manual trigger
   - Comprehensive codebase health assessment
   - Creates GitHub issues for findings

**EAS Build Profiles:**

- `development`: Dev client for local testing
- `preview`: CI builds with Release config, OTA channel `preview`
- `production`: Production builds with auto version bump

**EAS CLI Requirement:**

- Minimum version: `>= 16.27.0`
- App version source: `remote` (version managed by EAS)

**Required GitHub Secrets:**

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_TOKEN` (from expo.dev → Access Tokens)
- `CLAUDE_CODE_OAUTH_TOKEN` (for Claude Code Review, Auto Label, and Daily Review actions)

**Custom GitHub Action:**

`.github/actions/setup-project/action.yml` - Reusable action for:

- Node.js 22 setup
- pnpm installation with caching
- Dependency installation

## Security Reminders

- Never commit secrets, API keys, or connection strings
- Use environment variables for sensitive data (see Environment Configuration)
- Validate and sanitize all user inputs
- Use Supabase RLS policies for data access control
- Session tokens are stored securely (SecureStore on native, localStorage on web)

## MCP Server Usage

Always leverage these Model Context Protocol (MCP) servers when appropriate:

### Context7 (Documentation Lookup)

**Use for:**

- Looking up current API documentation for libraries/frameworks
- Verifying correct usage of third-party packages (Expo, Supabase, React Native)
- Finding code examples for unfamiliar APIs
- Checking for breaking changes in library versions

**Workflow:**

1. First call `resolve-library-id` with the library name
2. Then call `get-library-docs` with the resolved ID and relevant topic
3. Use `mode='code'` for API references/examples, `mode='info'` for conceptual guides

**Always use Context7 when:**

- Working with a library you haven't used recently
- The user asks about specific library functionality
- Implementing features that require external package APIs
- Unsure about correct method signatures or parameters

### Sequential Thinking (Problem Solving)

**Use for:**

- Breaking down complex problems into steps
- Planning multi-step implementations
- Analyzing bugs that require careful reasoning
- Architectural decisions with multiple considerations
- Problems where the full scope isn't immediately clear

**When to use:**

- Complex debugging sessions
- Implementing features with multiple dependencies
- Refactoring decisions that affect multiple files
- Performance optimization analysis

**Key features:**

- Adjust `total_thoughts` as understanding deepens
- Mark revisions with `is_revision: true`
- Branch exploration with `branch_from_thought`
- Express uncertainty and explore alternatives

### Memory (Knowledge Graph)

**Use for:**

- Storing user preferences and project context
- Remembering decisions made during development
- Tracking architectural patterns specific to this project
- Persisting information across conversations

**Operations:**

- `create_entities` - Store new facts/concepts
- `add_observations` - Add details to existing entities
- `create_relations` - Link related entities
- `search_nodes` - Find stored information
- `read_graph` - Review all stored knowledge

**When to use:**

- User explicitly asks to "remember" something
- Important project decisions are made
- User preferences are established
- Recurring patterns or conventions are identified

### Project-Specific MCP Servers

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

### MCP Usage Guidelines

1. **Prefer MCPs over guessing** - When uncertain about APIs, look them up with Context7
2. **Think through complex problems** - Use sequential thinking for multi-step tasks
3. **Persist important context** - Store decisions and preferences in memory
4. **Combine when needed** - Use Context7 to research, Sequential Thinking to plan, Memory to store decisions

## Code Style & Conventions

**MANDATORY Code Quality Standards:**

When writing or modifying code, you MUST follow these practices:

1. **Documentation**: Every function, method, and component MUST have JSDoc/TSDoc comments that work with IntelliSense
2. **Testing**: Add or update tests for any code changes; all tests must pass before committing
3. **Clean Code**: Remove unnecessary code, dead imports, and commented-out blocks
4. **File Organization**: Section files logically (imports, types, constants, component, styles)
5. **Naming Conventions**: Use recommended naming conventions for the language/framework
6. **Documentation Updates**: Update README.md and CLAUDE.md to reflect significant changes
7. **TODO Tracking**: Create and maintain TODO lists for multi-step tasks

**Documentation Standards (JSDoc/TSDoc):**

All exported functions, hooks, components, and complex logic MUST include documentation:

````typescript
/**
 * Calculates the number of days since a given date.
 *
 * @param startDate - The starting date to calculate from
 * @param endDate - The ending date (defaults to today)
 * @returns The number of days between the two dates, minimum 0
 *
 * @example
 * ```ts
 * const days = getDaysSince(new Date('2024-01-01'));
 * // Returns: 180 (if today is July 1, 2024)
 * ```
 */
function getDaysSince(startDate: Date, endDate: Date = new Date()): number {
  // implementation
}

/**
 * Custom hook for tracking user's sobriety streak.
 *
 * @returns Object containing days sober, loading state, and slip-up info
 *
 * @example
 * ```tsx
 * const { daysSober, hasSlipUps, loading } = useDaysSober();
 * ```
 */
function useDaysSober(): DaysSoberResult {
  // implementation
}

/**
 * Displays the user's recovery journey timeline with milestones.
 *
 * @remarks
 * This component fetches timeline events from Supabase and displays
 * them in chronological order with visual indicators.
 *
 * @see {@link useDaysSober} for sobriety calculation logic
 */
function JourneyScreen(): JSX.Element {
  // implementation
}
````

**File Organization:**

Organize files in this order with clear section comments:

```typescript
// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

// =============================================================================
// Types & Interfaces
// =============================================================================
interface Props {
  title: string;
}

// =============================================================================
// Constants
// =============================================================================
const DEFAULT_TIMEOUT = 5000;

// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Formats a date for display.
 */
function formatDate(date: Date): string {
  // implementation
}

// =============================================================================
// Component
// =============================================================================
/**
 * Main component description.
 */
export default function MyComponent({ title }: Props): JSX.Element {
  // implementation
}

// =============================================================================
// Styles
// =============================================================================
const styles = StyleSheet.create({
  // styles
});
```

**Naming Conventions:**

| Element            | Convention             | Example                        |
| ------------------ | ---------------------- | ------------------------------ |
| Components         | PascalCase             | `JourneyScreen`, `TaskCard`    |
| Functions/Hooks    | camelCase              | `useDaysSober`, `formatDate`   |
| Constants          | SCREAMING_SNAKE_CASE   | `DEFAULT_TIMEOUT`, `API_URL`   |
| Types/Interfaces   | PascalCase             | `UserProfile`, `TaskStatus`    |
| Files (components) | PascalCase             | `TaskCard.tsx`                 |
| Files (utilities)  | camelCase              | `validation.ts`                |
| CSS/Style keys     | camelCase              | `backgroundColor`, `marginTop` |
| Boolean variables  | is/has/should prefix   | `isLoading`, `hasSlipUps`      |
| Event handlers     | handle prefix          | `handlePress`, `handleSubmit`  |
| Async functions    | verb describing action | `fetchTasks`, `updateProfile`  |

**TypeScript Configuration (`tsconfig.json`):**

Key settings for performance and developer experience:

- `strict: true` - Full type safety
- `incremental: true` - Faster rebuilds via incremental compilation
- `skipLibCheck: true` - Skip type checking of declaration files
- `paths: { "@/*": ["./*"] }` - Path alias for clean imports

**TypeScript Best Practices:**

- Prefer explicit types over inference for public APIs
- Use database types from `types/database.ts` as source of truth
- Avoid `any` - use `unknown` with type guards when type is truly unknown

**Imports:**

- Use `@/` path alias for all local imports
- Group imports: React → third-party → local (Prettier enforces)
- Remove unused imports before committing

**Components:**

- Functional components with hooks (no class components)
- Props interfaces defined inline or exported if shared
- StyleSheet.create() for component styles (no inline objects)
- Extract reusable logic into custom hooks

**ESLint Configuration (`eslint.config.js`):**

This project uses ESLint flat config with:

- `eslint-config-expo/flat` as base configuration
- `eslint-config-prettier` for Prettier compatibility
- **`no-console: 'error'`** globally enforced (use `logger` from `@/lib/logger` instead)

Files exempt from `no-console`:

- `lib/logger.ts` - Logger implementation
- `lib/sentry.ts` - Sentry initialization
- `jest.setup.js` - Test setup

**Prettier Configuration (`.prettierrc`):**

| Setting         | Value      | Purpose                            |
| --------------- | ---------- | ---------------------------------- |
| `semi`          | `true`     | Use semicolons                     |
| `singleQuote`   | `true`     | Prefer single quotes               |
| `trailingComma` | `"es5"`    | Trailing commas where valid in ES5 |
| `printWidth`    | `100`      | Line wrap at 100 characters        |
| `tabWidth`      | `2`        | 2-space indentation                |
| `arrowParens`   | `"always"` | Always wrap arrow function params  |
| `endOfLine`     | `"lf"`     | Unix line endings                  |

**Pre-commit Hooks (Husky + lint-staged):**

Automatically runs on every commit:

1. **TypeScript/JavaScript files** (`*.{js,jsx,ts,tsx}`):
   - `prettier --write` - Auto-format
   - `eslint --fix` - Fix lint issues
2. **JSON/Markdown files** (`*.{json,md}`):
   - `prettier --write` - Auto-format

Skip hooks (not recommended): `git commit -n`

**Branch Naming (Conventional Branch):**

Use [Conventional Branch](https://conventional-branch.github.io/) naming format:

```text
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

```text
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

```text
feat(auth): add password reset flow
fix(journey): handle null avatar gracefully
refactor(tasks): optimize task loading logic
test(journey): add coverage for timeline events
chore(deps): bump expo-router to v6.0.15
docs(readme): update setup instructions
```

Breaking changes use `!` after scope:

```text
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
10. **Sentry tracks all environments** - errors appear in Sentry dashboard with environment tags (development/preview/production)
11. **Don't use console.log/error/warn directly** - use the universal logger instead (ESLint will catch this)
