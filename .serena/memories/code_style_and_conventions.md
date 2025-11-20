# Code Style & Conventions

## TypeScript

- **Strict mode enabled** (`strict: true`)
- Prefer explicit types over inference for public APIs
- Use database types from `types/database.ts` as source of truth
- No `any` without good reason
- `skipLibCheck: true` for faster builds

## Import Patterns

- **Path alias**: Use `@/` for all local imports
  - Example: `import { supabase } from '@/lib/supabase'`
- **Import ordering** (enforced by Prettier):
  1. React imports
  2. Third-party libraries
  3. Local imports (using `@/`)
- No default exports except for screens/pages

## Component Conventions

- **Functional components only** (no class components)
- Use React hooks
- Props interfaces:
  - Define inline for private components
  - Export if shared across files
- **Styling**: Use `StyleSheet.create()` for all styles
  - No inline style objects
  - Co-locate styles with components
  - Use theme colors from context

## File Naming

- Components: PascalCase (e.g., `Button.tsx`)
- Utilities/hooks: camelCase (e.g., `useAuth.ts`)
- Test files: `*.test.tsx` or `*.test.ts`
- Types: `database.ts`, `index.ts` for type definitions

## React Patterns

- Use `useEffect` for side effects
- Use `useContext` for global state (AuthContext, ThemeContext)
- Custom hooks for reusable logic
- Error boundaries for error handling

## Platform-Specific Code

- Use `Platform.OS` checks for platform differences
- Example: Storage adapter in `lib/supabase.ts`

```typescript
if (Platform.OS === 'web') {
  // web implementation
} else {
  // native implementation
}
```

## Formatting

- **Prettier** configuration in `.prettierrc`
- Auto-format on save (recommended)
- Pre-commit hook formats all staged files
- Line width: 100 characters (default)
- Semicolons: required
- Single quotes: enforced

## Linting

- **ESLint** with `eslint-config-expo`
- Prettier integration via `eslint-config-prettier`
- No ESLint warnings in production code
- Fix automatically: `pnpm lint --fix`

## Git Workflow

- **Husky + lint-staged** on every commit
- Pre-commit checks:
  1. Prettier format on staged files
  2. ESLint on staged TS/JS files
- Skip hooks: `git commit -n` (not recommended)
- Conventional commits encouraged

## Comments & Documentation

- Use JSDoc for exported functions/components
- Inline comments for complex logic only
- Self-documenting code preferred over comments
- Type annotations serve as documentation

## Testing Conventions

- Test file co-located with source: `Button.test.tsx` next to `Button.tsx`
- Use `renderWithProviders` from `test-utils/` for components
- Mock external dependencies with MSW
- 80% minimum coverage required
- Test fixtures in `test-utils/fixtures/`
