# CLAUDE.md - Sobers (Recovery App)

## Quick Reference

```bash
# Development
pnpm dev | web | ios | android    # Start dev server
pnpm start:clean                  # Clear Metro cache

# Quality (run before commit)
pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test

# Testing
pnpm test                         # All tests (80% coverage required)
pnpm test -- path/to/file.test.ts # Single file
pnpm test -- -t "pattern"         # By name
```

## Code Quality Requirements

**Mandatory workflow after ANY code change:**

1. Write/update tests (TDD: RED → GREEN → REFACTOR)
2. Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test`
3. Visual verification for UI changes (use Chrome DevTools MCP)
4. Commit with conventional commits: `<type>(<scope>): <description>`

**TDD is required** - write failing test first, then implementation.

## Architecture

**Stack:** Expo Router v6 + Supabase + React Native + TypeScript

**Routing:** File-based in `app/`, auth flow in `app/_layout.tsx`:

- Unauthenticated → `/login`
- No profile → `/onboarding`
- Complete → `/(tabs)`

**State:** Context API only (AuthContext, ThemeContext) - no Redux/Zustand

**Data:** Supabase client in `lib/supabase.ts`, types in `types/database.ts`

**Auth:** Supabase Auth (email/password, Google, Apple)

**Logging:** Use `logger` from `@/lib/logger` - never `console.log`

## Supabase Schema

| Table                           | Purpose                               |
| ------------------------------- | ------------------------------------- |
| `profiles`                      | User data, sobriety_date, preferences |
| `sponsor_sponsee_relationships` | Mentor connections                    |
| `tasks` / `task_completions`    | Recovery work items                   |
| `milestones`                    | Sobriety tracking                     |
| `messages` / `notifications`    | Communication                         |

**Key concept:** Role is contextual per relationship (sponsor_id vs sponsee_id)

## Testing

- Tests in `__tests__/` mirroring source structure
- Use `renderWithProviders()` from `__tests__/test-utils.tsx`
- Mock Supabase, navigation, and Expo modules (configured in `jest.setup.js`)
- 80% coverage enforced in CI

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_TOKEN=xxx                    # EAS builds
EXPO_PUBLIC_SENTRY_DSN=xxx        # Production
```

## Git Workflow

**Branches:** `<type>/<description>` (feat/, fix/, refactor/, etc.)

**Commits:** `<type>(<scope>): <description>`

- Scopes: auth, journey, tasks, profile, supabase, theme, deps, config
- Commit after each task, push only when ALL tasks complete

**Never:** Force push to main/develop, skip typecheck, commit .env

## Release Checklist

Before creating a release, complete this checklist in order:

### 1. Verify All Changes Committed

```bash
git status                        # Should show clean working tree
git log --oneline -10             # Review recent commits
```

### 2. Run Full Quality Suite

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test
```

All must pass with no errors.

### 3. Bump Version (Automatic)

Use semantic versioning (MAJOR.MINOR.PATCH):

- **PATCH** (1.1.0 → 1.1.1): Bug fixes, minor updates
- **MINOR** (1.1.0 → 1.2.0): New features, backward-compatible
- **MAJOR** (1.1.0 → 2.0.0): Breaking changes

```bash
# Automatically bump version in package.json AND app.config.ts:
# For patch release:
npm version patch --no-git-tag-version && \
  sed -i '' "s/version: '[0-9]*\.[0-9]*\.[0-9]*'/version: '$(node -p "require('./package.json').version")'/" app.config.ts

# For minor release:
npm version minor --no-git-tag-version && \
  sed -i '' "s/version: '[0-9]*\.[0-9]*\.[0-9]*'/version: '$(node -p "require('./package.json').version")'/" app.config.ts

# For major release:
npm version major --no-git-tag-version && \
  sed -i '' "s/version: '[0-9]*\.[0-9]*\.[0-9]*'/version: '$(node -p "require('./package.json').version")'/" app.config.ts
```

### 4. Update CHANGELOG.md

Add entry at the top following this format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New feature description

### Changed

- Modified behavior description

### Fixed

- Bug fix description

### Removed

- Removed feature description
```

### 5. Create Release Commit

```bash
git add package.json app.config.ts CHANGELOG.md
git commit -m "chore(release): bump version to X.Y.Z"
```

### 6. Tag and Push

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --tags
```

## Visual Verification (UI Changes)

```bash
pnpm web  # Start dev server
# Then use Chrome DevTools MCP:
# - navigate_page, take_snapshot, take_screenshot
# - click, fill, list_console_messages
# - Verify: no errors, correct layout, interactions work
```

Skip only for: docs-only, type-only, test-only, or config changes.

## Common Pitfalls

1. Wrap test components with `renderWithProviders`
2. Use `@/` path alias for imports
3. Types come from `types/database.ts` - don't edit generated types
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
