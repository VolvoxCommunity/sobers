# Design Patterns & Guidelines

## Authentication Guard Pattern

The root layout (`app/_layout.tsx`) enforces authentication flow:

```typescript
// Check user state and route accordingly
if (!user && inAuthGroup) {
  router.replace('/login');
} else if (user && profile && profile.sobriety_date && inAuthScreen) {
  router.replace('/(tabs)');
} else if (user && !profile.sobriety_date && !inOnboarding) {
  router.replace('/onboarding');
}
```

**Key principle**: Never bypass auth guards. All routes are protected.

## Context Provider Pattern

Root layout wraps entire app with providers:

```typescript
<ErrorBoundary>
  <ThemeProvider>
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  </ThemeProvider>
</ErrorBoundary>
```

**Access contexts via hooks**:

- `useAuth()` → user, session, profile, auth methods
- `useTheme()` → theme, isDark, setTheme

## Platform-Aware Storage Adapter

`lib/supabase.ts` implements cross-platform storage:

```typescript
const ExpoSecureStoreAdapter = {
  getItem: (key) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  // ... setItem, removeItem
};
```

**Pattern**: Check `Platform.OS` for platform-specific implementations.

## Typed Database Access

All Supabase queries use generated types:

```typescript
import { Profile } from '@/types/database';
const { data } = await supabase.from('profiles').select('*').single();
```

**Never use `any` for database results** - types are canonical.

## Error Handling Strategy

1. **Global**: Sentry SDK wraps root component
2. **Component-level**: ErrorBoundary for React errors
3. **Async operations**: Try-catch with user-friendly messages
4. **Production-only tracking**: `if (!__DEV__)` guards Sentry calls

## Theme System

ThemeContext provides centralized theme management:

- System mode respects OS preference
- Persists across sessions (SecureStore/localStorage)
- Components use `useTheme()` hook for colors

**Pattern**: Define colors in theme, not hardcoded in components.

## Supabase Real-time Subscriptions

For live updates (messages, tasks):

```typescript
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, callback)
  .subscribe();

// Cleanup
return () => {
  channel.unsubscribe();
};
```

**Remember**: Unsubscribe in cleanup to prevent memory leaks.

## Row Level Security (RLS)

All database access governed by RLS policies in Supabase:

- Users can only see their own data
- Sponsor-sponsee relationships enforce access
- No client-side permission checks needed

**Trust RLS** - don't duplicate permission logic in frontend.

## Navigation Patterns

Expo Router provides typed navigation:

```typescript
import { useRouter } from 'expo-router';
const router = useRouter();

router.push('/profile'); // Add to stack
router.replace('/login'); // Replace current
router.back(); // Go back
```

**Use typed routes** - TypeScript will catch invalid paths.

## Testing Patterns

### Component Testing

Use `renderWithProviders` to wrap components with contexts:

```typescript
import { renderWithProviders } from '@/test-utils';
renderWithProviders(<MyComponent />);
```

### API Mocking

MSW handlers in `__mocks__/` for Supabase calls:

```typescript
rest.get('https://xyz.supabase.co/rest/v1/profiles', (req, res, ctx) => {
  return res(ctx.json([mockProfile]));
});
```

### E2E Testing

Maestro flows for critical paths:

- Authentication flow
- Task creation/completion
- Messaging

## Common Pitfalls to Avoid

1. **Don't read Supabase env vars after build**
   - Only `EXPO_PUBLIC_*` vars available in app code

2. **Don't skip typecheck before push**
   - CI will fail, costing time

3. **Don't bypass authentication guards**
   - Test all routes with different auth states

4. **Don't commit `.env`**
   - Use `.env.example` as template

5. **Don't edit generated types**
   - Update Supabase schema instead

6. **Don't use `any` without justification**
   - Strict mode is enforced for a reason

7. **Don't forget to wrap test components**
   - Use `renderWithProviders` for context access

8. **Metro cache issues?**
   - Run `pnpm start:clean` when imports break mysteriously

9. **Sentry errors not showing?**
   - Sentry is production-only (`!__DEV__`)

10. **Platform-specific features**
    - Always check `Platform.OS` and test on target platforms
