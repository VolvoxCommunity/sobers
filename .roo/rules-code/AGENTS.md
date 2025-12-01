# Project Coding Rules (Non-Obvious Only)

- Always use the universal logger from `lib/logger.ts` instead of console methods (ESLint enforces this)
- Database operations must use the typed Supabase client with types from `types/database.ts`
- All imports must use the `@/` path alias (configured in tsconfig.json)
- File organization requires section comments: `// =============================================================================
- Components must use `StyleSheet.create()` for styles (no inline style objects)
- Supabase client is a singleton Proxy that lazy-initializes to prevent SSR issues
- Auth state changes must be handled through AuthContext, not direct Supabase auth calls
- Error objects must be passed to `logger.error()` for proper stack traces in Sentry
- Platform-specific code requires `Platform.OS` checks (especially for storage)
- Boolean variables must use is/has/should prefix (isLoading, hasSlipUps)
- Event handlers must use handle or on prefix (handleSubmit, onClick)
- Async functions must use verb describing action (fetchData, updateProfile)
- Use explicit types for public APIs, avoid `any` - use `unknown` with type guards
- Group imports: framework → third-party → local (Prettier enforces)
- Extract reusable logic into custom hooks
- Account deletion must call RPC function `delete_user_account` for cascading cleanup
- All exported functions/components require JSDoc/TSDoc documentation
