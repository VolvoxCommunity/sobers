# Suggested Commands

## Development Server
```bash
pnpm dev              # Start Expo dev server (all platforms)
pnpm ios              # Launch in iOS simulator (macOS only)
pnpm android          # Launch in Android emulator/device
pnpm web              # Launch web version
pnpm start:clean      # Start with cleared Metro cache
```

## Quality Checks (Pre-commit/Pre-push)
```bash
pnpm typecheck        # TypeScript type checking (REQUIRED before push)
pnpm lint             # ESLint validation
pnpm format           # Auto-format with Prettier
pnpm format:check     # Check formatting without modifying
```

## Testing
```bash
pnpm test                           # Run all Jest tests
pnpm test:watch                     # Run in watch mode
pnpm test -- --coverage             # Run with coverage (80% required)
pnpm test -- path/to/file.test.tsx  # Run specific test file
pnpm test -- -t "pattern"           # Run tests matching pattern
pnpm maestro                        # Run all E2E flows
pnpm maestro:record                 # Record new E2E flow
```

## Build & Deploy
```bash
pnpm build:web        # Build static web bundle → dist/
eas build --profile preview         # Preview build (Android + iOS)
eas build --profile production      # Production build
```

## Maintenance
```bash
pnpm clean:metro      # Clear Metro bundler cache
pnpm clean:all        # Nuclear: clear everything and reinstall
```

## System Utilities (Darwin/macOS)
```bash
ls                    # List directory contents
cd                    # Change directory
grep                  # Search text in files
find                  # Find files by name/pattern
git status            # Check git status
git log               # View commit history
```

## Single Test Execution
```bash
# Run specific test file
pnpm test -- components/Button.test.tsx

# Run specific test suite/case
pnpm test -- -t "Button component"

# Watch mode for specific file
pnpm test:watch -- components/Button.test.tsx
```
