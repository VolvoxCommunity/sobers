# Changelog

All notable user-facing changes to Sobers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add Program section replacing Steps tab with 5 sub-sections: Steps, Daily, Prayers, Literature, Meetings
- Add horizontal top tabs navigation within Program section
- Add sponsor/sponsee connection system with Intent & Ownership pattern
- Add `ConnectionIntent` type with `not_looking`, `seeking_sponsor`, `open_to_sponsoring`, `open_to_both` options
- Add `ConnectionIntentSelector` component for users to set their connection preferences on profile
- Add `PersistentInviteCard` component showing active invite codes with expiration timer, copy, share, regenerate, and revoke actions
- Add `SymmetricRevealSection` component for mutual consent contact sharing within relationships
- Add `ExternalHandlesSection` in Settings for storing private contact info (Discord, Telegram, WhatsApp, Signal, Phone)
- Add `external_handles` JSONB field to profiles for storing contact info privately
- Add `sponsor_reveal_consent` and `sponsee_reveal_consent` columns to relationships for symmetric reveal
- Add `revoked_at` and `intent` columns to invite_codes for better invite management
- Add database migration with RLS policies for connection intent, external handles, and symmetric reveal

### Changed

- Move Steps screens from `/steps` to `/program/steps`
- Update Settings toggle label from "Include 12-Step Content" to "Show 12-Step Program" with expanded description

### Removed

### Fixed

- Fix Steps tab still showing in native tab bar when 12-step content toggle is disabled
- Fix bottom sheet text inputs not working on web by using platform-specific InputComponent pattern

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
