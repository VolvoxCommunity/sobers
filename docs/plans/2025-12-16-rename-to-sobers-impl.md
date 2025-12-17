# Rename to Sobers - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand the app from "Sobriety Waypoint" to "Sobers" across all user-facing strings, configuration, and documentation.

**Architecture:** Simple search-and-replace across ~30 files. No structural changes. Bundle IDs preserved for App Store continuity.

**Tech Stack:** TypeScript, React Native, Expo, Jest

**Reference Design:** See `docs/plans/2025-12-16-rename-to-sobers-design.md` for full scope.

---

## Task 1: Update Core Configuration - package.json

**Files:**

- Modify: `package.json:2`

**Step 1: Update package name**

Change line 2 from:

```json
"name": "sobriety-waypoint",
```

To:

```json
"name": "sobers",
```

**Step 2: Verify JSON is valid**

Run: `node -e "require('./package.json')"`
Expected: No output (valid JSON)

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore(config): rename package to sobers"
```

---

## Task 2: Update Core Configuration - app.config.ts

**Files:**

- Modify: `app.config.ts:51-54,124,157`

**Step 1: Update app name, slug, and scheme**

Change lines 51-54 from:

```typescript
name: 'Sobriety Waypoint',
owner: 'volvox-llc',
slug: 'sobriety-waypoint',
scheme: 'sobrietywaypoint',
```

To:

```typescript
name: 'Sobers',
owner: 'volvox-llc',
slug: 'sobers',
scheme: 'sobers',
```

**Step 2: Update expo-router origin**

Change line 124 from:

```typescript
origin: 'https://sobrietywaypoint.com',
```

To:

```typescript
origin: 'https://sobers.app',
```

**Step 3: Update Sentry project name**

Change line 157 from:

```typescript
project: 'sobriety-waypoint',
```

To:

```typescript
project: 'sobers',
```

**Step 4: Add TODO for EAS project ID**

Add comment above line 48 (extra.eas.projectId):

```typescript
// TODO: Replace projectId with new EAS project ID after creating 'sobers' project at expo.dev
```

**Step 5: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 6: Commit**

```bash
git add app.config.ts
git commit -m "chore(config): update app.config.ts for Sobers rebrand"
```

---

## Task 3: Update App Layout - Page Titles & Meta Tags

**Files:**

- Modify: `app/_layout.tsx:113,131,140,144,185-194`

**Step 1: Update page title helper function**

Find and replace all occurrences of `Sobriety Waypoint` with `Sobers` in the `getPageTitle` function (around lines 113-144).

Changes:

- Line 113: `return 'Sobriety Waypoint';` → `return 'Sobers';`
- Line 131: `return \`${titles[pathname]} | Sobriety Waypoint\`;` → `return \`${titles[pathname]} | Sobers\`;`
- Line 140: `return 'Step Details | Sobriety Waypoint';` → `return 'Step Details | Sobers';`
- Line 144: `return 'Sobriety Waypoint';` → `return 'Sobers';`

**Step 2: Update Open Graph meta tags**

Change lines 185-188 from:

```tsx
<meta property="og:title" content="Sobriety Waypoint" />
...
<meta property="og:site_name" content="Sobriety Waypoint" />
<meta property="og:image" content="https://sobrietywaypoint.com/assets/images/banner.png" />
```

To:

```tsx
<meta property="og:title" content="Sobers" />
...
<meta property="og:site_name" content="Sobers" />
<meta property="og:image" content="https://sobers.app/assets/images/banner.png" />
```

**Step 3: Update Twitter meta tags**

Change lines 192-194 from:

```tsx
<meta name="twitter:title" content="Sobriety Waypoint" />
...
<meta name="twitter:image" content="https://sobrietywaypoint.com/assets/images/banner.png" />
```

To:

```tsx
<meta name="twitter:title" content="Sobers" />
...
<meta name="twitter:image" content="https://sobers.app/assets/images/banner.png" />
```

**Step 4: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/_layout.tsx
git commit -m "refactor(layout): update page titles and meta tags for Sobers"
```

---

## Task 4: Update Login Screen

**Files:**

- Modify: `app/login.tsx:86`
- Modify: `__tests__/app/login.test.tsx:99`

**Step 1: Update login screen title**

Change line 86 from:

```tsx
<Text style={styles.title}>Sobriety Waypoint</Text>
```

To:

```tsx
<Text style={styles.title}>Sobers</Text>
```

**Step 2: Update login test expectation**

Change line 99 in `__tests__/app/login.test.tsx` from:

```typescript
expect(screen.getByText('Sobriety Waypoint')).toBeTruthy();
```

To:

```typescript
expect(screen.getByText('Sobers')).toBeTruthy();
```

**Step 3: Run login tests**

Run: `pnpm test -- __tests__/app/login.test.tsx`
Expected: All tests pass

**Step 4: Commit**

```bash
git add app/login.tsx __tests__/app/login.test.tsx
git commit -m "refactor(login): update title to Sobers"
```

---

## Task 5: Update Onboarding Screen

**Files:**

- Modify: `app/onboarding.tsx:316`
- Modify: `__tests__/app/onboarding.test.tsx:226`

**Step 1: Update onboarding welcome message**

Change line 316 from:

```tsx
<Text style={styles.title}>Welcome to Sobriety Waypoint</Text>
```

To:

```tsx
<Text style={styles.title}>Welcome to Sobers</Text>
```

**Step 2: Update onboarding test expectation**

Change line 226 in `__tests__/app/onboarding.test.tsx` from:

```typescript
expect(screen.getByText('Welcome to Sobriety Waypoint')).toBeTruthy();
```

To:

```typescript
expect(screen.getByText('Welcome to Sobers')).toBeTruthy();
```

**Step 3: Run onboarding tests**

Run: `pnpm test -- __tests__/app/onboarding.test.tsx`
Expected: All tests pass

**Step 4: Commit**

```bash
git add app/onboarding.tsx __tests__/app/onboarding.test.tsx
git commit -m "refactor(onboarding): update welcome message to Sobers"
```

---

## Task 6: Update Profile Screen - Share Message

**Files:**

- Modify: `app/(tabs)/profile.tsx:213`

**Step 1: Update share invite message**

Change line 213 from:

```typescript
message: `Join me on Sobriety Waypoint! Use invite code: ${code}`,
```

To:

```typescript
message: `Join me on Sobers! Use invite code: ${code}`,
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "refactor(profile): update share message to Sobers"
```

---

## Task 7: Update Settings Components

**Files:**

- Modify: `components/settings/SettingsContent.tsx:817`
- Modify: `components/settings/constants.ts:10`
- Modify: `components/settings/utils.ts:70`

**Step 1: Update footer text in SettingsContent**

Change line 817 from:

```tsx
<Text style={styles.footerText}>Sobriety Waypoint v{packageJson.version}</Text>
```

To:

```tsx
<Text style={styles.footerText}>Sobers v{packageJson.version}</Text>
```

**Step 2: Update Terms of Service URL in constants**

Change line 10 from:

```typescript
TERMS_OF_SERVICE: 'https://sobrietywaypoint.com/terms',
```

To:

```typescript
TERMS_OF_SERVICE: 'https://sobers.app/terms',
```

**Step 3: Update debug build info header in utils**

Change line 70 from:

```typescript
'=== Sobriety Waypoint Build Info ===',
```

To:

```typescript
'=== Sobers Build Info ===',
```

**Step 4: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add components/settings/SettingsContent.tsx components/settings/constants.ts components/settings/utils.ts
git commit -m "refactor(settings): update branding to Sobers"
```

---

## Task 8: Update Settings Tests

**Files:**

- Modify: `__tests__/app/settings.test.tsx:651`
- Modify: `__tests__/components/SettingsSheet.test.tsx:806,1145`

**Step 1: Update settings.test.tsx ToS URL expectation**

Change line 651 from:

```typescript
expect(Linking.openURL).toHaveBeenCalledWith('https://sobrietywaypoint.com/terms');
```

To:

```typescript
expect(Linking.openURL).toHaveBeenCalledWith('https://sobers.app/terms');
```

**Step 2: Update SettingsSheet.test.tsx ToS URL expectation**

Change line 806 from:

```typescript
expect(mockOpenURL).toHaveBeenCalledWith('https://sobrietywaypoint.com/terms');
```

To:

```typescript
expect(mockOpenURL).toHaveBeenCalledWith('https://sobers.app/terms');
```

**Step 3: Update SettingsSheet.test.tsx footer text expectation**

Change line 1145 from:

```typescript
expect(screen.getByText(/Sobriety Waypoint v/)).toBeTruthy();
```

To:

```typescript
expect(screen.getByText(/Sobers v/)).toBeTruthy();
```

**Step 4: Run settings tests**

Run: `pnpm test -- __tests__/app/settings.test.tsx __tests__/components/SettingsSheet.test.tsx`
Expected: All tests pass

**Step 5: Commit**

```bash
git add __tests__/app/settings.test.tsx __tests__/components/SettingsSheet.test.tsx
git commit -m "test(settings): update expectations for Sobers branding"
```

---

## Task 9: Update AuthContext - OAuth Scheme

**Files:**

- Modify: `contexts/AuthContext.tsx:442`

**Step 1: Update OAuth redirect scheme**

Change line 442 from:

```typescript
scheme: 'sobrietywaypoint',
```

To:

```typescript
scheme: 'sobers',
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add contexts/AuthContext.tsx
git commit -m "refactor(auth): update OAuth scheme to sobers"
```

---

## Task 10: Update AuthContext Tests - OAuth URLs

**Files:**

- Modify: `__tests__/contexts/AuthContext.test.tsx` (multiple lines)

**Step 1: Replace all sobrietywaypoint:// URLs with sobers://**

Use find-and-replace across the file:

- Find: `sobrietywaypoint://`
- Replace: `sobers://`

Lines affected: 100, 960, 980, 1060, 1112, 1135, 1158, 1198, 1215, 1232, 1249, 1266, 1291, 1316, 1333, 1357, 1372, 1412

**Step 2: Run AuthContext tests**

Run: `pnpm test -- __tests__/contexts/AuthContext.test.tsx`
Expected: All tests pass

**Step 3: Commit**

```bash
git add __tests__/contexts/AuthContext.test.tsx
git commit -m "test(auth): update OAuth URL expectations to sobers://"
```

---

## Task 11: Update README.md

**Files:**

- Modify: `README.md`

**Step 1: Update title and badges**

Change line 1 from:

```markdown
# Sobriety Waypoint
```

To:

```markdown
# Sobers
```

**Step 2: Update Expo badge URL**

Change the Expo badge (around line 4) from:

```markdown
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)](https://expo.dev/accounts/volvox-llc/projects/sobriety-waypoint)
```

To:

```markdown
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)](https://expo.dev/accounts/volvox-llc/projects/sobers)
```

**Step 3: Update app description**

Change line 22 from:

```markdown
Sobriety Waypoint helps people in recovery...
```

To:

```markdown
Sobers helps people in recovery...
```

**Step 4: Update deep link scheme references**

Change line 140 from:

```markdown
- Deep link scheme: `sobrietywaypoint://`
```

To:

```markdown
- Deep link scheme: `sobers://`
```

**Step 5: Update Expo builds dashboard link**

Change line 190 from:

```markdown
- Monitor native builds at [Expo builds dashboard](https://expo.dev/accounts/volvox-llc/projects/sobriety-waypoint/builds)
```

To:

```markdown
- Monitor native builds at [Expo builds dashboard](https://expo.dev/accounts/volvox-llc/projects/sobers/builds)
```

**Step 6: Commit**

```bash
git add README.md
git commit -m "docs(readme): update branding to Sobers"
```

---

## Task 12: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

**Step 1: Update deep linking scheme reference**

Change line 452 from:

```markdown
- Deep linking: `sobrietywaypoint://` scheme
```

To:

```markdown
- Deep linking: `sobers://` scheme
```

**Step 2: Update Sentry project reference**

Change line 650 from:

```markdown
SENTRY_PROJECT=sobriety-waypoint
```

To:

```markdown
SENTRY_PROJECT=sobers
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): update deep link scheme and Sentry project"
```

---

## Task 13: Update AGENTS.md

**Files:**

- Modify: `AGENTS.md:91`
- Modify: `.roo/rules-debug/AGENTS.md:6,14`

**Step 1: Update AGENTS.md deep link reference**

Change line 91 from:

```markdown
- Deep linking scheme: `sobrietywaypoint://` for native OAuth callbacks
```

To:

```markdown
- Deep linking scheme: `sobers://` for native OAuth callbacks
```

**Step 2: Update .roo/rules-debug/AGENTS.md references**

Change line 6 from:

```markdown
- OAuth redirect failures: Check scheme configuration in `app.config.ts` (sobrietywaypoint://)
```

To:

```markdown
- OAuth redirect failures: Check scheme configuration in `app.config.ts` (sobers://)
```

Change line 14 from:

```markdown
- OAuth redirect failures: Check scheme in `app.config.ts` (sobrietywaypoint://) and WebBrowser handling
```

To:

```markdown
- OAuth redirect failures: Check scheme in `app.config.ts` (sobers://) and WebBrowser handling
```

**Step 3: Commit**

```bash
git add AGENTS.md .roo/rules-debug/AGENTS.md
git commit -m "docs(agents): update deep link scheme references"
```

---

## Task 14: Update Setup Documentation

**Files:**

- Modify: `docs/logger.md:3`
- Modify: `docs/APPLE_SIGNIN_SETUP.md:3,39,40,46,63,82,215`
- Modify: `docs/GOOGLE_OAUTH_SETUP.md:3,25,41,58,59,66,67,97,103,116,119,140`

**Step 1: Update docs/logger.md**

Change line 3 from:

```markdown
...for the Sobriety Waypoint application.
```

To:

```markdown
...for the Sobers application.
```

**Step 2: Update docs/APPLE_SIGNIN_SETUP.md**

Replace all occurrences:

- `Sobriety Waypoint` → `Sobers`
- `sobrietywaypoint` → `sobers` (in scheme contexts only, NOT bundle IDs)

Note: Keep `com.volvox.sobrietywaypoint` bundle ID unchanged.

**Step 3: Update docs/GOOGLE_OAUTH_SETUP.md**

Replace all occurrences:

- `Sobriety Waypoint` → `Sobers`
- `sobrietywaypoint://` → `sobers://`
- `sobrietywaypoint.com` → `sobers.app`

Note: Keep `com.volvox.sobrietywaypoint` bundle ID and package name unchanged.

**Step 4: Commit**

```bash
git add docs/logger.md docs/APPLE_SIGNIN_SETUP.md docs/GOOGLE_OAUTH_SETUP.md
git commit -m "docs(setup): update branding in setup guides"
```

---

## Task 15: Update Historical Plan Documents

**Files:**

- Modify: `docs/plans/2025-12-09-display-name-condensed-onboarding-design.md:88`
- Modify: `docs/plans/2025-12-10-liquid-glass-native-navigation-impl.md:5`
- Modify: `docs/plans/2025-12-10-liquid-glass-native-navigation-design.md:5`

**Step 1: Update each plan document**

Replace `Sobriety Waypoint` with `Sobers` in each file.

**Step 2: Commit**

```bash
git add docs/plans/2025-12-09-display-name-condensed-onboarding-design.md \
        docs/plans/2025-12-10-liquid-glass-native-navigation-impl.md \
        docs/plans/2025-12-10-liquid-glass-native-navigation-design.md
git commit -m "docs(plans): update historical plans with Sobers branding"
```

---

## Task 16: Update Analytics Types

**Files:**

- Modify: `types/analytics.ts:3`
- Modify: `lib/analytics/index.ts:2`

**Step 1: Update analytics type definitions comment**

Change line 3 in `types/analytics.ts` from:

```typescript
* Firebase Analytics type definitions for Sobriety Waypoint.
```

To:

```typescript
* Firebase Analytics type definitions for Sobers.
```

**Step 2: Update analytics module comment**

Change line 2 in `lib/analytics/index.ts` from:

```typescript
* Unified Firebase Analytics module for Sobriety Waypoint.
```

To:

```typescript
* Unified Firebase Analytics module for Sobers.
```

**Step 3: Commit**

```bash
git add types/analytics.ts lib/analytics/index.ts
git commit -m "docs(analytics): update module comments for Sobers"
```

---

## Task 17: Final Validation

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: All 1883+ tests pass

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Run linter**

Run: `pnpm lint`
Expected: No errors

**Step 4: Run formatter**

Run: `pnpm format`
Expected: Files formatted

**Step 5: Run format check**

Run: `pnpm format:check`
Expected: All files formatted correctly

**Step 6: Build web to verify compilation**

Run: `pnpm build:web`
Expected: Build succeeds

---

## Task 18: Update Design Document Status

**Files:**

- Modify: `docs/plans/2025-12-16-rename-to-sobers-design.md:4`

**Step 1: Update status to Implemented**

Change line 4 from:

```markdown
**Status:** Approved
```

To:

```markdown
**Status:** Implemented
```

**Step 2: Commit**

```bash
git add docs/plans/2025-12-16-rename-to-sobers-design.md
git commit -m "docs(plans): mark rename design as implemented"
```

---

## Summary

**Total Tasks:** 18
**Total Commits:** ~17 atomic commits
**Files Modified:** ~30 files

**After Implementation - External Actions Required:**

1. Create new EAS project at expo.dev named "sobers"
2. Update `app.config.ts` with new projectId
3. Rename Sentry project in dashboard
4. Update OAuth redirect URLs in Supabase, Google, Apple
5. Ensure sobers.app domain is configured
