# Task Completion Checklist

## Before Committing

### 1. Type Check (MANDATORY)
```bash
pnpm typecheck
```
- Must pass with zero errors
- CI will fail without this

### 2. Lint Check
```bash
pnpm lint
```
- Fix issues: `pnpm lint --fix`
- No warnings allowed in production code

### 3. Format Check
```bash
pnpm format:check
```
- Auto-format: `pnpm format`
- Pre-commit hook will auto-format, but check beforehand

### 4. Run Tests
```bash
pnpm test -- --coverage
```
- All tests must pass
- 80% minimum coverage required across:
  - Statements
  - Branches
  - Functions
  - Lines

### 5. Verify Changes
- Review modified files
- Ensure no sensitive data (API keys, tokens)
- Check `.env` is not included
- Verify database types are up-to-date if schema changed

## Git Commit
```bash
git add .
git commit -m "descriptive message"
```
- Husky pre-commit hook runs automatically:
  - Prettier formats staged files
  - ESLint checks staged TS/JS files
- Skip hooks only if absolutely necessary: `git commit -n`

## After Push (PR/CI)
- GitHub Actions CI runs:
  1. Lint check
  2. Format check
  3. Type check
  4. Web build
  5. Android/iOS preview builds (EAS)
  6. Claude Code Review
- Monitor build status
- Address any CI failures immediately

## Special Cases

### Database Schema Changes
1. Update Supabase schema (via migrations or dashboard)
2. Regenerate types: Check Supabase Studio → API Docs → TypeScript types
3. Update `types/database.ts`
4. Run `pnpm typecheck` to catch breaking changes
5. Update affected components

### Adding New Dependencies
```bash
pnpm add <package>          # Regular dependency
pnpm add -D <package>       # Dev dependency
expo install <package>      # Expo-compatible package
```
- Verify package compatibility with React Native
- Check if native configuration needed
- Update README if adding major dependency

### New E2E Tests
```bash
pnpm maestro:record         # Record new flow
pnpm maestro               # Verify it passes
```
- Save flows in `.maestro/` directory
- Document flow purpose in comments

### Environment Variable Changes
1. Update `.env.example` with new variables
2. Document in relevant setup docs
3. Update GitHub Secrets if needed for CI
4. Update EAS Secrets: `eas secret:create --scope project`

## Quick Pre-Push Command
```bash
pnpm typecheck && pnpm lint && pnpm test
```
- Run this before pushing to catch issues early
