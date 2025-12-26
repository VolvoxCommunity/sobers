# Changelog

All notable changes to Sobers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add What's New popup feature showing release highlights when users have unseen content
- Add `whats_new_releases` and `whats_new_features` Supabase tables for managing release content
- Add `WhatsNewSheet` component for displaying new features in a bottom sheet modal with release info, feature cards, and dismiss button
- Add `WhatsNewFeatureCard` component for displaying feature highlights in What's New popup
- Add `useWhatsNew` hook for fetching and managing What's New release data
- Add `last_seen_version` field to Profile type for tracking seen What's New releases
- Add "What's New" row in Settings About section to manually view latest release features
- Add `dev`, `supabase:start`, and `supabase:stop` scripts for local development with OAuth env vars
- Add expense tracking feature to visualize money saved since sobriety start date
- Add optional savings tracking setup during onboarding with amount and frequency inputs
- Add Money Saved dashboard card showing total savings and daily/weekly/monthly breakdown
- Add edit bottom sheet to modify or clear savings tracking data
- Add `spend_amount` and `spend_frequency` fields to profiles table
- Add savings calculation utilities with currency formatting
- Add unconfigured state for Money Saved card showing setup prompt when spending data not set
- Add three-dot menu to Money Saved card with "Edit savings" and "Hide from dashboard" options
- Add Dashboard section in Settings with toggle to show/hide savings card
- Add `hide_savings_card` field to profiles table for persisting card visibility preference
- Add setup mode to EditSavingsSheet with "Set Up Savings Tracking" title and "Get Started" button

### Changed

- Enable Google OAuth provider in Supabase auth configuration with GOOGLE_CLIENT_ID and GOOGLE_SECRET environment variables
- Add React.memo to TaskCard, MyTasksView, and ManageTasksView components to prevent unnecessary re-renders during list interactions
- Update MoneySavedCard to support configured and unconfigured variants via discriminated union types
- Update Money Saved card to require menu interaction for editing (removed card tap-to-edit behavior)
- Rename Supabase environment variables from `EXPO_PUBLIC_SUPABASE_*` to `SUPABASE_*` and `SUPABASE_ANON_KEY` to `SUPABASE_PUBLISHABLE_KEY` (exposed via app.config.ts extra)

### Fixed

- Fix "What's New" settings row doing nothing when no release is available - now shows info toast
- Fix Money Saved card not updating on home tab after editing savings amount or frequency
- Fix `_scrollRef` null error when dismissing LogSlipUpSheet by replacing BottomSheetTextInput with standard TextInput
- Fix potential race condition in EditSavingsSheet where profile refresh could show stale data by awaiting onSave callback before sheet dismissal

## [1.1.0] - 2025-12-19

### Added

- Add comprehensive Playwright E2E test suite with 124 tests covering authentication, home dashboard, profile, settings, tasks, and step flows
- Add Page Object Model pattern for E2E test maintainability with dedicated page objects for all screens
- Add GitHub Actions E2E workflow with 4-shard parallelization and Playwright browser caching
- Add testID attributes across all components for reliable E2E test targeting
- Add SQL seeding script and test fixtures for E2E test data
- Add `pnpm test:e2e`, `test:e2e:all`, `test:e2e:ui`, `test:e2e:debug` scripts
- Add Developer Tools section in Settings (visible only in `__DEV__` mode) with: Test Sentry Error, Verbose Logging toggle, Copy User ID, Reset Onboarding, Clear Slip-Ups, Time Travel, Fire Test Analytics Event, and Analytics Debug toggle
- Add `DevToolsContext` for managing dev tools state across the app
- Add stateful `GlassBottomSheet` mock to `jest.setup.js` for proper modal visibility testing
- Add `BottomSheetTextInput`, `BottomSheetFooter`, and `BottomSheetHandle` to `@gorhom/bottom-sheet` mock
- Add dedicated tests for SettingsContent component covering App Updates (OTA) UI states
- Add `pnpm release:patch`, `pnpm release:minor`, `pnpm release:major` scripts for automated releases
- Add npm lifecycle hooks (`version`, `postversion`) to automate version sync, commit, tag, and push
- Add toast notification system with `showToast.success()`, `showToast.error()`, `showToast.info()` API

### Changed

- Pin native module versions to Expo SDK 54 requirements
- Add `metro-minify-terser` as explicit devDependency for Vercel build compatibility with Metro 0.83+
- Improve E2E GitHub Actions workflow with concurrency cancellation and Playwright browser caching
- Enable verbose logging by default in development mode
- Wire up Verbose Logging toggle to control logger output
- Replace success and error alerts with toast notifications for non-blocking UX
- Migrate ~30 alert calls across auth, settings, profile, and task screens to unified toast API
- Refactor TaskCompletionModal to TaskCompletionSheet using GlassBottomSheet
- Extract platform-specific alert/confirm utilities into separate modules
- Added mandatory CHANGELOG.md update requirement to development workflow
- Simplified release checklist from 6 manual steps to 4 steps with automated release command

### Fixed

- Fix "What's New" settings row doing nothing when no release is available - now shows info toast

- Fix Vercel deployment by using standard Expo Metro config (Sentry Metro serializer incompatible with Metro 0.83+)
- Fix toast messages being cut off by replacing BaseToast with custom component that properly wraps text
- Fix Reset Onboarding dev tool by clearing fields correctly and using explicit navigation
- Fix FAB button overlapping with tab bar on tasks screen
- Fix step completion not showing in list after navigating back from detail screen
- Fix theme toggle and all buttons not working in settings bottom sheet
- Fix login screen not redirecting to app after successful sign-in
- Fix invite code claiming RLS policy violation
- Fix duplicate key error when reconnecting to a previously disconnected sponsor
- Improve invite code error messages with contextual guidance
- Fix EAS workflow triggers: replace invalid `release` trigger with `push.tags` pattern

## [1.0.1] - 2025-12-17

### Added

- JSDoc documentation for profile, login, settings utils, and Supabase client modules

### Fixed

- Fix "What's New" settings row doing nothing when no release is available - now shows info toast

- Restored missing newlines at end of files (POSIX compliance)

## [1.0.0] - 2025-12-17

### Added

Initial release

[Unreleased]: https://github.com/VolvoxCommunity/sobers/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/VolvoxCommunity/sobers/compare/v1.0.0...v1.1.0
[1.0.1]: https://github.com/VolvoxCommunity/sobers/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/VolvoxCommunity/sobers/releases/tag/v1.0.0
