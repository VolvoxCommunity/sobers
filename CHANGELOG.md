# Changelog

All notable changes to Sobers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Add React.memo to TaskCard, MyTasksView, and ManageTasksView components to prevent unnecessary re-renders during list interactions

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

- Restored missing newlines at end of files (POSIX compliance)

## [1.0.0] - 2025-12-17

### Added

Initial release

[Unreleased]: https://github.com/VolvoxCommunity/sobers/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/VolvoxCommunity/sobers/compare/v1.0.0...v1.1.0
[1.0.1]: https://github.com/VolvoxCommunity/sobers/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/VolvoxCommunity/sobers/releases/tag/v1.0.0
