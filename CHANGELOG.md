# Changelog

All notable changes to Sobers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add dedicated tests for SettingsContent component covering App Updates (OTA) UI states: idle, checking, downloading, ready, up-to-date, and error
- Add `pnpm release:patch`, `pnpm release:minor`, `pnpm release:major` scripts for automated releases
- Add npm lifecycle hooks (`version`, `postversion`) to automate version sync, commit, tag, and push

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
- Migrate ~30 alert calls across auth, settings, profile, and task screens to unified toast API (`showToast.success()`, `showToast.error()`)
- Add themed toast config with platform-specific shadows and app design language
- Refactor TaskCompletionModal to TaskCompletionSheet using GlassBottomSheet for consistent UI pattern across all modals (swipe-to-dismiss, Liquid Glass styling, imperative API)
- Extract platform-specific alert/confirm utilities into separate modules (`lib/alert/platform.native.ts`, `lib/alert/platform.web.ts`) following Metro auto-resolution pattern for cleaner architecture
- Added mandatory CHANGELOG.md update requirement to development workflow in CLAUDE.md
- Updated release checklist to clarify [Unreleased] → version transition process
- Added dedicated "CHANGELOG Maintenance (CRITICAL)" section with comprehensive guidelines based on [Keep a Changelog v1.1.0](https://keepachangelog.com/en/1.1.0/), including all 6 change categories (Added, Changed, Deprecated, Removed, Fixed, Security), guiding principles, and anti-patterns to avoid
- Simplified release checklist from 6 manual steps to 4 steps with automated release command

## [1.0.1] - 2025-12-17

### Added

- JSDoc documentation for profile, login, settings utils, and Supabase client modules

### Fixed

- Restored missing newlines at end of files (POSIX compliance)

## [1.0.0] - 2025-12-17

### Added

- Vercel Analytics integration for web platform
- Chunked SecureStore implementation to handle values larger than 2048 bytes
- Consolidated Supabase migration for database branching support
- App update functionality in settings screen
- 1 week (7 days) sobriety milestone in journey
- Collapsible DANGER ZONE dropdown for delete account option
- Deep link support for OAuth handling with token extraction
- Comprehensive Jest unit tests for increased test coverage
- Automatic semantic version bumping workflow on push to main
- New onboarding screens with improved user experience
- Universal Sentry logging library for cross-platform error tracking
- EAS Update configuration for over-the-air updates
- JSDoc documentation for authentication functions
- Expo Router v6 file-based routing
- Supabase authentication (email/password, Google Sign-In, Apple Sign-In)
- User profiles with sobriety date tracking
- Sponsor/sponsee relationship management
- Task management with completion tracking
- Sobriety milestone celebrations
- 12-step program progress tracking
- Dark/light theme support
- Cross-platform support (iOS, Android, Web)
- Jest testing infrastructure
- CI/CD with GitHub Actions
- EAS Build configuration

### Changed

- **BREAKING**: Renamed application from "Sobriety Waypoint" to "Sobers"
- Updated OAuth deep link scheme from `sobriety-waypoint://` to `sobers://`
- Updated package name to `sobers`
- Centralized theming with removal of hardcoded colors throughout the app
- Updated privacy and terms URLs to sobers.app domain
- Normalized domain URLs to remove www subdomain
- Moved complete button to fixed footer in step modals
- Unified close button styling across all modals
- Improved dark mode styling and close button visibility
- Downgraded react-native-svg from 15.15.1 to 15.12.1 for stability
- Removed role selection UI from onboarding flow
- Improved breadcrumb category handling in Sentry logger
- Enhanced auto-labeling workflow with clearer guidelines

### Fixed

- Added key props to theme icons to prevent React warnings
- SecureStore read operation error handling improvements
- Migration error messages now include user context
- Storage adapter setItem and removeItem error handling
- Profile screen displays loading indicator instead of null days sober
- Android Alert dismissal handling to prevent unresolved Promise
- Branch coverage threshold adjustments in test configuration
- iOS Google Sign-In infinite loading screen resolved
- Task stats in sponsee section now correctly filter by sponsor_id
- Step modal no longer crashes during close animation
- Navigation path for task management corrected
- CI workflow now uses GitHub App token for version bump operations
- Authentication timeout to prevent indefinite loading on stale sessions
- Stuck loading state from nested auth listener resolved
- Duplicate user profile creation prevention during signup

### Security

- Migrated auth token storage to SecureStore on native devices for improved security
- Secure session management with Supabase Auth
- Environment variable management for sensitive configuration

[Unreleased]: https://github.com/VolvoxCommunity/Sobriety-Waypoint/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/VolvoxCommunity/Sobriety-Waypoint/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/VolvoxCommunity/Sobriety-Waypoint/releases/tag/v1.0.0
