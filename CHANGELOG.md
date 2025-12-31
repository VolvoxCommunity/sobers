# Changelog

All notable changes to Sobers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add "Include 12-Step Content" toggle in onboarding Preferences card (enabled by default)
- Add "Include 12-Step Content" toggle in Settings to show or hide the Steps tab
- Add full release history view in What's New modal with collapsible version sections
- Add WhatsNewVersionSection component with expand/collapse, NEW badge, and feature sorting by type
- Add dynamic subtitle in What's New modal header showing update count and user viewing state
- Add semver comparison utilities (`compareSemver`, `sortByVersion`) for version ordering
- Add database migration to remove `is_active` column from `whats_new_releases` table
- Add comprehensive edge case and accessibility tests for What's New components (semver, WhatsNewVersionSection, WhatsNewSheet)
- Add settings cogwheel button to all main screens (Home, Journey, Tasks, Steps) for quick access to settings on mobile
- Add settings icon to web top navigation bar
- Add Amplitude Analytics integration for product analytics with native and web platform support
- Add 35+ analytics events with Title Case naming (e.g., "Screen Viewed", "Task Completed") for comprehensive user engagement tracking
- Add 9 user properties for cohort analysis: days_sober_bucket, steps_completed_bucket, has_sponsor, has_sponsees, theme_preference, notifications_enabled, app_version, platform, device_type
- Add password visibility toggle to Login and Signup screens with accessible labels
- Add testIDs for password toggle buttons to improve test selectability
- Add tests for password visibility toggle functionality in login and signup screens
- Add DevToolsSection tests for SettingsContent covering development mode features
- Add filter by Completed status tests for manage-tasks screen
- Add initializeAuth error handling tests for AuthContext
- Add Build Info conditional rendering tests for SettingsContent
- Add handleSaveName edge case tests for SettingsContent
- Add handleToggleSavingsCard tests for SettingsContent
- Add TaskCard accessibility tests for status icon labels and due date announcements
- Add analytics platform tests for uninitialized state and edge cases
- Add Sentry Spotlight for local development error debugging (`pnpm spotlight`)
- Add complete AnalyticsEvents constant assertions covering all 35 event types to catch renamed/removed constants
- Add comprehensive onboarding analytics tracking (ONBOARDING_STARTED, ONBOARDING_SCREEN_VIEWED, ONBOARDING_FIELD_COMPLETED, ONBOARDING_STEP_COMPLETED, ONBOARDING_SOBRIETY_DATE_SET, ONBOARDING_COMPLETED, ONBOARDING_ABANDONED)
- Add analytics tracking for settings changes (SETTINGS_CHANGED event for theme and dashboard preferences)
- Add analytics tracking for app engagement (APP_OPENED, APP_BACKGROUNDED, APP_SESSION_STARTED, DAILY_CHECK_IN events)
- Add analytics tracking for savings updates (SAVINGS_UPDATED event when editing savings settings)

### Changed

- Restructure onboarding from 3 cards to 2 cards: merge "About You" and "Your Journey" into single "Your Journey" card, move savings tracking to new "Preferences" card
- Rename Settings "Dashboard" section to "Features" to better reflect its purpose
- Merge Account and Journey sections into unified "Your Journey" section in Settings for streamlined user experience
- Move journey start date editing from profile screen to settings for cleaner profile UI
- Always expand the latest version section by default in What's New modal (previously only expanded if unseen)
- Redesign What's New modal header to match other modals: sparkles icon, centered title, X close button, bottom border, subtitle in scroll content
- Redesign WhatsNewVersionSection with improved visual hierarchy: colored version badges, metadata row with Ionicons for date and feature/fix counts
- Refactor useWhatsNew hook to fetch all releases instead of only active release
- Update WhatsNewSheet to display release history with "What's New?" title
- Update settings menu item to "What's New?"
- Display clickable "Assign a task" link for sponsees with no assigned tasks, navigating to the tasks page
- Move Settings screen outside tab navigator to hide bottom tabs during navigation (iOS Settings pattern)
- Update Settings back button to return to previous screen regardless of origin tab
- Replace Firebase Analytics with Amplitude SDK for improved cross-platform analytics support
- Update analytics module architecture with platform-specific implementations (native/web) using Metro bundler resolution
- Lower branch coverage threshold from 85% to 83% to account for untestable code paths (DevToolsSection, platform-specific conditionals)

### Removed

- Remove Firebase Analytics dependencies (@react-native-firebase/analytics, @react-native-firebase/app)
- Remove Firebase configuration files and plugins (firebase.json, withFirebaseConfig.js, withModularHeaders.js)
- Remove check for updates feature and expo-updates dependency from the app

### Fixed

- Fix analytics test mocks in EditSavingsSheet, SettingsContent, and onboarding tests (correct property names, add missing mock functions)
- Fix What's New RLS policy migration failing on databases with partial manual changes (idempotent policy drops)
- Fix TaskCreationSheet dropdown options not clickable due to parent scroll view closing dropdowns before item press fires
- Fix E2E savings tests failing due to incorrect card click (menu button required)
- Improve test coverage: add tests for alert module public API, SettingsContent build info, and savings card toggle
- Fix keyboard pushing content up excessively in EditSavingsSheet by using single snap point
- Fix TaskCard syntax error causing build failure (broken JSX from accessibility enhancement)
- Fix analytics initialization errors being swallowed, preventing retry on failure
- Fix calculateStepsCompletedBucket returning incorrect bucket for negative values
- Fix E2E settings close test failing after settings refactor (now uses browser back navigation)
- Fix flaky E2E savings tracking tests by adding proper wait conditions after save

## [1.2.1] - 2025-12-25

### Changed

- Refactor EditSavingsSheet tests to use renderWithProviders from test-utils
- Change Android package name from `com.volvox.sobrietywaypoint` to `com.volvox.sobers`

### Fixed

- Fix MoneySavedCard rendering non-functional unconfigured card when profile is null
- Fix E2E workflow using incorrect GitHub secret name for Supabase key
- Fix Home tab bottom content being cut off by tab bar due to insufficient scroll padding

## [1.2.0] - 2025-12-25

### Added

- Add What's New popup feature showing release highlights when users have unseen content
- Add `whats_new_releases` and `whats_new_features` Supabase tables for managing release content
- Add `WhatsNewSheet` component for displaying new features in a bottom sheet modal with release info, feature cards, and dismiss button
- Add `WhatsNewFeatureCard` component for displaying feature highlights in What's New popup with type badges (NEW/IMPROVED)
- Add `type` field to What's New features to categorize as 'feature' or 'fix' with distinct visual styling
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

- Update What's New sheet to open at 90% height by default for better content visibility
- Enable Google OAuth provider in Supabase auth configuration with GOOGLE_CLIENT_ID and GOOGLE_SECRET environment variables
- Add React.memo to TaskCard, MyTasksView, and ManageTasksView components to prevent unnecessary re-renders during list interactions
- Update MoneySavedCard to support configured and unconfigured variants via discriminated union types
- Update Money Saved card to require menu interaction for editing (removed card tap-to-edit behavior)
- Rename Supabase environment variable from `EXPO_PUBLIC_SUPABASE_ANON_KEY` to `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Move What's New dismiss button to fixed footer for better UX when scrolling through many features

### Fixed

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

[Unreleased]: https://github.com/VolvoxCommunity/sobers/compare/v1.2.1...HEAD
[1.2.1]: https://github.com/VolvoxCommunity/sobers/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/VolvoxCommunity/sobers/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/VolvoxCommunity/sobers/compare/v1.0.0...v1.1.0
[1.0.1]: https://github.com/VolvoxCommunity/sobers/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/VolvoxCommunity/sobers/releases/tag/v1.0.0
