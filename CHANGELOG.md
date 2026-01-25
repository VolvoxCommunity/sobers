# Changelog

All notable user-facing changes to Sobers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add "Show 12 Step Program" toggle in onboarding Preferences card (enabled by default)
- Add "Show 12 Step Program" toggle in Settings to show or hide the Program tab
- Add conditional Steps tab visibility based on user preference (hidden when 12-step content disabled)
- Add redirect from Steps screen to home when 12-step content is disabled
- Add database migration for `show_twelve_step_content` column on profiles table
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

- Update Settings toggle label from "Include 12-Step Content" to "Show 12 Step Program" with expanded description covering steps, daily readings, prayers, literature, and meeting tracker
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
- Reduce Amplitude SDK log level from Debug to Warn to eliminate verbose internal logging in debug mode

### Removed

### Fixed

## [1.3.0] - 2026-01-27

### Added

- 12-Step Content Toggle: Show or hide the Steps tab via onboarding and settings preferences
- Redesigned What's New modal with full release history view and collapsible sections
- Settings cogwheel for quick access from Home, Journey, Tasks, and Steps screens
- Password visibility toggle on Login and Signup screens

### Changed

- Streamlined onboarding flow from 3 cards to 2 cards
- Merged Account and Journey sections into unified "Your Journey" in Settings
- Moved Settings screen outside tab navigator (follows iOS Settings pattern)

### Removed

- Check for updates feature

### Fixed

- Steps tab now properly hides when 12-step content toggle is disabled
- Task creation dropdown options are now clickable
- Keyboard no longer pushes content up in savings edit sheet

## [1.0.0] - 2025-12-17

### Added

Initial release
