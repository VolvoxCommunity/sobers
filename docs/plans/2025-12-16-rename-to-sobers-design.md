# Rename: Sobriety Waypoint → Sobers

**Date:** 2025-12-16
**Status:** Approved
**Goal:** Rebrand the app from "Sobriety Waypoint" to "Sobers" across all user-facing and developer-facing references.

---

## Scope Overview

### What's Changing

| Element          | From                   | To           |
| ---------------- | ---------------------- | ------------ |
| App Display Name | `Sobriety Waypoint`    | `Sobers`     |
| Package Name     | `sobriety-waypoint`    | `sobers`     |
| URL Scheme       | `sobrietywaypoint://`  | `sobers://`  |
| Domain           | `sobrietywaypoint.com` | `sobers.app` |
| EAS Slug         | `sobriety-waypoint`    | `sobers`     |
| Sentry Project   | `sobriety-waypoint`    | `sobers`     |

### What's NOT Changing

| Element          | Value                                  | Reason                                   |
| ---------------- | -------------------------------------- | ---------------------------------------- |
| Bundle IDs       | `com.volvox.sobrietywaypoint`          | Preserve App Store/Play Store continuity |
| Firebase Project | `sobriety-waypoint`                    | Firebase projects cannot be renamed      |
| EAS Project ID   | `8d64bbe4-27d4-41ac-9421-9c2758e4765a` | Will be replaced with new project ID     |

---

## Files to Modify

### Core Configuration Files

| File            | Changes                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| `package.json`  | `name`: `sobriety-waypoint` → `sobers`                                          |
| `app.config.ts` | `name`, `slug`, `scheme`, `origin`, Sentry project, EAS projectId & updates URL |

### App Source Files

| File                                      | Changes                                          |
| ----------------------------------------- | ------------------------------------------------ |
| `app/_layout.tsx`                         | Page titles, Open Graph meta tags, Twitter cards |
| `app/login.tsx`                           | Title text                                       |
| `app/onboarding.tsx`                      | Welcome message                                  |
| `app/(tabs)/profile.tsx`                  | Share message text                               |
| `components/settings/SettingsContent.tsx` | Footer text                                      |
| `components/settings/constants.ts`        | Terms of Service URL                             |
| `components/settings/utils.ts`            | Debug build info header                          |
| `contexts/AuthContext.tsx`                | OAuth scheme                                     |

### Test Files

| File                                          | Changes                                      |
| --------------------------------------------- | -------------------------------------------- |
| `__tests__/app/login.test.tsx`                | Expected title text                          |
| `__tests__/app/onboarding.test.tsx`           | Expected welcome text                        |
| `__tests__/app/settings.test.tsx`             | Expected ToS URL                             |
| `__tests__/components/SettingsSheet.test.tsx` | Expected ToS URL, footer text                |
| `__tests__/contexts/AuthContext.test.tsx`     | All `sobrietywaypoint://` URLs → `sobers://` |
| `__tests__/config/app.config.test.ts`         | Bundle ID assertions (unchanged)             |

### Documentation Files

| File                         | Changes                                     |
| ---------------------------- | ------------------------------------------- |
| `README.md`                  | Title, description, deep link references    |
| `CLAUDE.md`                  | Deep link scheme, Sentry project references |
| `AGENTS.md`                  | Deep link scheme references                 |
| `docs/logger.md`             | App name in description                     |
| `docs/APPLE_SIGNIN_SETUP.md` | App name references                         |
| `docs/GOOGLE_OAUTH_SETUP.md` | App name, scheme references                 |
| `docs/plans/*.md`            | Historical references                       |
| `.roo/rules-debug/AGENTS.md` | Deep link scheme references                 |

---

## Implementation Approach

### Search-and-Replace Patterns

| Search Pattern         | Replace With | Context                             |
| ---------------------- | ------------ | ----------------------------------- |
| `Sobriety Waypoint`    | `Sobers`     | User-facing display name            |
| `sobriety-waypoint`    | `sobers`     | Package names, slugs, project IDs   |
| `sobrietywaypoint://`  | `sobers://`  | Deep link URLs                      |
| `sobrietywaypoint.com` | `sobers.app` | Domain references                   |
| `sobrietywaypoint`     | `sobers`     | Scheme declarations (without `://`) |

### Order of Operations

1. **Update `app.config.ts` first** — Source of truth for app identity
2. **Update source files** — Login, onboarding, settings, auth context
3. **Update test files** — Ensure tests match new values
4. **Update documentation** — README, CLAUDE.md, setup guides
5. **Run validation** — `pnpm typecheck && pnpm lint && pnpm test`

### Special Handling

- **EAS Project ID**: Leave placeholder comment `// TODO: Replace with new EAS project ID`
- **Bundle IDs**: Explicitly skip — preserve `com.volvox.sobrietywaypoint`
- **Firebase files**: Skip `google-services.json` and `GoogleService-Info.plist`

---

## Validation

### Pre-Implementation Checklist

- [ ] All current tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Working tree is clean (`git status`)

### Post-Implementation Validation

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test
```

### Test Expectations

| Test File              | What It Validates                               |
| ---------------------- | ----------------------------------------------- |
| `login.test.tsx`       | "Sobers" title renders correctly                |
| `onboarding.test.tsx`  | "Welcome to Sobers" displays                    |
| `settings.test.tsx`    | ToS URL points to `sobers.app`                  |
| `AuthContext.test.tsx` | OAuth redirects use `sobers://` scheme          |
| `app.config.test.ts`   | Bundle IDs remain `com.volvox.sobrietywaypoint` |

### Rollback Strategy

Single atomic commit — rollback via:

```bash
git revert <commit-hash>
```

---

## External Actions Required

### Before Deploying

| Action                 | Where                          | Details                                              |
| ---------------------- | ------------------------------ | ---------------------------------------------------- |
| Create new EAS project | [expo.dev](https://expo.dev)   | Create project named "sobers", copy new `projectId`  |
| Own domain             | Domain registrar               | Ensure `sobers.app` is registered and DNS configured |
| Rename Sentry project  | [sentry.io](https://sentry.io) | Settings → General → Project Name → "sobers"         |

### After Code Merge, Before Production

| Action                    | Where                                  | Details                                           |
| ------------------------- | -------------------------------------- | ------------------------------------------------- |
| Update Supabase redirects | Supabase Dashboard → Auth → URL Config | Add `sobers://auth/callback` to allowed redirects |
| Update Google OAuth       | Google Cloud Console → Credentials     | Update redirect URIs to `sobers://`               |
| Update Apple OAuth        | Apple Developer Portal → Services IDs  | Update redirect URLs (if using web OAuth)         |
| Deploy `sobers.app`       | Your hosting                           | Ensure Terms of Service page exists at `/terms`   |

### Firebase Note

Firebase project names cannot be changed. Recommendation: Keep existing Firebase project — the name is only visible in Firebase console, not to users.

---

## Summary

This rename affects ~30 files with text replacements only. No structural changes to code architecture. The key risk areas are:

1. **OAuth flows** — Require external configuration updates
2. **EAS updates** — Require new project creation
3. **Domain** — Must be owned and configured before deployment

All changes are reversible via git revert.
