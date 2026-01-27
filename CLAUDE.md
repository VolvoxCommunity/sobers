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

# Release (see Release Checklist section below)
```

## Code Quality Requirements

**Mandatory workflow after ANY code change:**

1. Write/update tests (TDD: RED → GREEN → REFACTOR)
2. Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test`
3. Visual verification for UI changes (use Chrome DevTools MCP)
4. **Update CHANGELOG.md** - Add entry under `[Unreleased]` section for user-facing changes only
5. Commit with conventional commits: `<type>(<scope>): <description>`

**TDD is required** - write failing test first, then implementation.

## CHANGELOG Maintenance

**Update CHANGELOG.md for user-facing changes only.**

The changelog is for end users to understand what changed between releases—not a log of all development activity.

**Reference:** [Keep a Changelog v1.1.0](https://keepachangelog.com/en/1.1.0/)

### What to Include (User-Facing Changes)

- New features users can see or interact with
- Bug fixes that affected user experience
- Changes to existing functionality users will notice
- Deprecations users need to be aware of
- Security fixes

### What NOT to Include

- Internal refactors that don't change behavior
- Test additions or modifications
- CI/CD pipeline changes
- Documentation updates (unless user-facing docs)
- Dependency updates (unless they fix user-visible bugs)
- Code style/formatting changes
- Developer tooling changes

### Guiding Principles

- **For end users, not developers** - Write clear entries describing user impact
- **Reverse chronological** - Newest entries at the top
- **ISO 8601 dates** - Use `YYYY-MM-DD` format (e.g., 2025-12-17)

### Change Categories

```markdown
## [Unreleased]

### Added

- New user-facing features and capabilities

### Changed

- User-visible modifications to existing functionality

### Deprecated

- Features users should know will be removed

### Removed

- User-facing features that have been deleted

### Fixed

- Bug fixes that impacted user experience

### Security

- Security fixes users should be aware of
```

### What to Avoid

- ❌ Copying git commit messages verbatim
- ❌ Including internal refactors or test changes
- ❌ Using ambiguous date formats (MM/DD/YY)
- ❌ Logging every change regardless of user impact

### Examples of Good Entries

- `- Add user authentication with Google Sign-In`
- `- Update profile screen to display days sober count`
- `- Deprecate legacy API v1 endpoints (removal in v3.0)`
- `- Fix navigation crash on Android back button press`
- `- Security: Migrate auth tokens to SecureStore`

### Examples of What NOT to Log

- ❌ `- Refactor auth context for better maintainability`
- ❌ `- Add unit tests for profile screen`
- ❌ `- Update CI workflow to run on Node 20`
- ❌ `- Remove unused utility functions from helpers module`

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
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxx
EXPO_TOKEN=xxx                    # EAS builds
EXPO_PUBLIC_SENTRY_DSN=xxx        # Production
```

## Git Workflow

**Branches:** `<type>/<description>` (feat/, fix/, refactor/, etc.)

**Commits:** `<type>(<scope>): <description>`

- Scopes: auth, journey, tasks, profile, supabase, theme, deps, config
- Commit after each task, push only when ALL tasks complete

**Never:** Force push to main/develop, skip typecheck, skip formatting, skip running tests, skip building, commit .env

## Release Checklist

Before creating a release, complete these 5 steps:

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

### 3. Update CHANGELOG.md

Move all entries from `[Unreleased]` to the new version section:

1. Create new version heading: `## [X.Y.Z] - YYYY-MM-DD`
2. Move all content from `[Unreleased]` to the new version section
3. Leave `[Unreleased]` section empty (ready for next cycle)
4. Update comparison links at bottom of file

```markdown
## [Unreleased]

## [X.Y.Z] - YYYY-MM-DD

### Added

- New feature description (moved from Unreleased)

### Changed

- Modified behavior description (moved from Unreleased)

### Fixed

- Bug fix description (moved from Unreleased)
```

### 4. Bump Version (Manual)

Use semantic versioning (MAJOR.MINOR.PATCH):

| Type      | When to Use                       |
| --------- | --------------------------------- |
| **PATCH** | Bug fixes, minor updates          |
| **MINOR** | New features, backward-compatible |
| **MAJOR** | Breaking changes                  |

**Steps:**

1. Update `version` in `package.json` (e.g., `"1.2.1"` → `"1.2.2"`)
2. Update `version` in `app.config.ts` to match
3. Stage and commit: `git add -A && git commit -m "vX.Y.Z"`
4. Create tag: `git tag vX.Y.Z`
5. Push with tags: `git push origin HEAD --tags`

### 5. Create Release PR

Create a pull request for the release:

- **Title:** `vX.Y.Z` (the release version)
- **Description:** Include the changelog entries for this release

```bash
gh pr create --title "vX.Y.Z" --body "$(cat <<'EOF'
## Release vX.Y.Z

### Added
- Feature descriptions from CHANGELOG

### Changed
- Change descriptions from CHANGELOG

### Fixed
- Fix descriptions from CHANGELOG
EOF
)"
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
