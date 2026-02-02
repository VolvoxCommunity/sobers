# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Essential Commands

**Required validation workflow before committing:**

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test
```

**Single test execution:**

```bash
pnpm test -- path/to/test-file.test.tsx         # Run specific test file
pnpm test:watch -- path/to/test-file.test.tsx   # Watch mode for specific file
pnpm test -- -t "test name pattern"             # Run tests matching pattern
```

**Development with cache clearing:**

```bash
pnpm start:clean      # Start with cleared Metro cache (when debugging import issues)
```

## Critical Architecture Patterns

**Authentication Flow:**

- Root layout (`app/_layout.tsx`) enforces auth routing based on user state
- Auth state determines routing: no user → `/login`, user without profile → `/onboarding`, complete profile → `/(tabs)`
- Profile completeness requires both name (not defaults "User U") and sobriety_date
- OAuth profile creation extracts name from user metadata with fallbacks
- Auth state changes trigger profile refresh and Sentry context updates

**Supabase Client:**

- Uses custom storage adapter for platform-aware persistence (SecureStore native, localStorage web)
- Singleton pattern with lazy initialization via Proxy to prevent SSR issues
- All database operations must use typed client from `types/database.ts` (source of truth)
- Storage adapter handles SSR gracefully (no-op during server-side rendering)
- Client auto-refreshes tokens and persists sessions across app restarts

**Role System:**

- No role field in profiles - users can be both sponsors and sponsees
- Role is contextual, determined by relationship (sponsor_id vs sponsee_id)
- Tasks flow unidirectional: sponsor → sponsee within relationships
- Users can have multiple simultaneous relationships in different roles
- Invite codes connect sponsors to sponsees without requiring email exchange

## Non-Obvious Requirements

**Logging:**

- NEVER use console.log/error/warn directly - use logger from `lib/logger.ts`
- All logs automatically sent to Sentry as breadcrumbs with categorized metadata
- Only exceptions: logger.ts, sentry.ts, jest.setup.js (permitted to use console)
- Logger uses reserved keys (error_message, error_stack, error_name) - avoid in metadata
- LogCategory enum provides structured categorization (AUTH, DATABASE, UI, etc.)

**Error Handling:**

- Sentry wraps entire app for crash reporting in all environments
- ErrorBoundary component provides graceful failures
- Privacy scrubbing configured in `lib/sentry-privacy.ts` for PII protection
- Account deletion calls RPC function `delete_user_account` for cascading cleanup
- Auth errors include detailed context for debugging without exposing sensitive data

**Testing:**

- Use `renderWithProviders` from test-utils to wrap components with AuthContext/ThemeContext
- Supabase client mocked with chainable query builder in jest.setup.js
- Coverage threshold temporarily low (10%) - incrementally increase as tests added
- Test mocks include platform detection (defaults to iOS) and timezone handling
- AsyncStorage and SecureStore are mocked to prevent actual storage during tests

**File Organization:**

- All imports must use `@/` path alias (configured in tsconfig.json)
- File organization order: imports → types → constants → helpers → main logic → exports
- Section comments required: `// =============================================================================
- JSDoc/TSDoc documentation mandatory for all exported functions/components
- Boolean variables use is/has/should prefix (isLoading, hasSlipUps)

**Platform-Specific Considerations:**

- Google OAuth uses WebBrowser for native, direct redirect for web
- Storage differs: SecureStore (native) vs localStorage (web)
- Deep linking scheme: `sobers://` for native OAuth callbacks
- Font loading (JetBrains Mono) must complete before hiding splash screen
- Device timezone captured during profile creation for date display consistency

**State Management:**

- Context API only (no Redux/Zustand) - contexts wrap entire app in root layout
- AuthContext provides: user, session, profile, loading, auth methods
- ThemeContext provides: theme, isDark, setTheme (light/dark/system)
- Mount status tracking with useRef prevents closure issues in async operations

**Fast Apply:** IMPORTANT: Use `edit_file` over `str_replace` or full file writes. It works with partial code snippets—no need for full file content.

**Warp Grep:** warp-grep is a subagent that takes in a search string and tries to find relevant context. Best practice is to use it at the beginning of codebase explorations to fast-track finding relevant files/lines. Do not use it to pinpoint keywords, but use it for broader semantic queries. "Find the XYZ flow", "How does XYZ work", "Where is XYZ handled?", "Where is <error message> coming from?"
