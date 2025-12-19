# Changelog

All notable changes to Sobers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add Developer Tools section in Settings (visible only in `__DEV__` mode) with: Test Sentry Error, Verbose Logging toggle, Copy User ID, Reset Onboarding, Clear Slip-Ups, Time Travel, Fire Test Analytics Event, and Analytics Debug toggle
- Add `DevToolsContext` for managing dev tools state across the app
- Add stateful `GlassBottomSheet` mock to `jest.setup.js` for proper modal visibility testing
- Add `BottomSheetTextInput`, `BottomSheetFooter`, and `BottomSheetHandle` to `@gorhom/bottom-sheet` mock

### Changed

- Improve E2E GitHub Actions workflow with concurrency cancellation (cancels in-progress runs on same PR) and Playwright browser caching for faster CI runs
- Enable verbose logging by default in development mode
- Wire up Verbose Logging toggle to control logger output (when disabled, only warn/error logs are shown)

### Fixed

- Fix toast messages being cut off by replacing BaseToast with custom component that properly wraps text without truncation
- Fix Reset Onboarding dev tool by clearing `display_name` and `sobriety_date` fields (update instead of delete to avoid RLS/FK constraints) and using explicit `router.replace('/onboarding')` navigation

## [1.1.0] - 2025-12-18

### Added

- Add comprehensive E2E test suite using Playwright for web with 56 tests covering all user flows
- Add Page Object Model pattern for E2E test maintainability (10 page objects)
- Add GitHub Actions workflow with 4-shard parallelization for E2E tests on every PR
- Add testID attributes across all screens for E2E test targeting
- Add SQL seeding script for E2E test data
- Add `pnpm test:e2e`, `test:e2e:all`, `test:e2e:ui`, `test:e2e:debug` scripts
- Add dedicated tests for SettingsContent component covering App Updates (OTA) UI states: idle, checking, downloading, ready, up-to-date, and error
- Add `pnpm release:patch`, `pnpm release:minor`, `pnpm release:major` scripts for automated releases
- Add npm lifecycle hooks (`version`, `postversion`) to automate version sync, commit, tag, and push
- Add toast notification system with `showToast.success()`, `showToast.error()`, `showToast.info()` API

### Fixed

- Fix FAB button overlapping with tab bar on tasks screen by increasing bottom offset
- Fix step completion not showing in list after navigating back from detail screen by using useFocusEffect to refetch progress when screen gains focus
- Fix theme toggle and all buttons not working in settings bottom sheet by reordering providers (ThemeProvider and AuthProvider must wrap BottomSheetModalProvider) and replacing TouchableOpacity with Pressable for proper touch handling inside BottomSheetScrollView
- Fix login screen not redirecting to app after successful sign-in by adding Redirect component when user is authenticated
- Fix invite code claiming RLS policy violation by recreating update policy with correct conditions
- Fix duplicate key error when reconnecting to a previously disconnected sponsor by reactivating existing inactive relationship instead of inserting
- Improve invite code error messages with contextual guidance (expired, already used by self, already used by others)
- Fix EAS workflow triggers: replace invalid `release` trigger with `push.tags` pattern (EAS Workflows only supports `push` triggers)

### Changed

- Replace success and error alerts with toast notifications for non-blocking UX using `react-native-toast-message`
- Migrate ~30 alert calls across auth, settings, profile, and task screens to unified toast API
- Add themed toast config with platform-specific shadows and app design language
- Refactor TaskCompletionModal to TaskCompletionSheet using GlassBottomSheet for consistent UI pattern across all modals (swipe-to-dismiss, Liquid Glass styling, imperative API)
- Extract platform-specific alert/confirm utilities into separate modules (`lib/alert/platform.native.ts`, `lib/alert/platform.web.ts`) following Metro auto-resolution pattern for cleaner architecture
- Added mandatory CHANGELOG.md update requirement to development workflow in CLAUDE.md
- Updated release checklist to clarify [Unreleased] → version transition process
- Added dedicated "CHANGELOG Maintenance (CRITICAL)" section with comprehensive guidelines
- Simplified release checklist from 6 manual steps to 4 steps with automated release command

## [1.0.1] - 2025-12-17

### Added

- JSDoc documentation for profile, login, settings utils, and Supabase client modules

### Fixed

- Restored missing newlines at end of files (POSIX compliance)

## [1.0.0] - 2025-12-17

### Added

Initial release

[Unreleased]: https://github.com/VolvoxCommunity/sobers/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/VolvoxCommunity/sobers/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/VolvoxCommunity/sobers/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/VolvoxCommunity/sobers/releases/tag/v1.0.0
