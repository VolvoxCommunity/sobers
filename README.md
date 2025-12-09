# Sobriety Waypoint

![License](https://img.shields.io/badge/license-MIT-blue.svg)
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)](https://expo.dev/accounts/volvox-llc/projects/sobriety-waypoint)
[![CI](https://github.com/VolvoxCommunity/Sobriety-Waypoint/actions/workflows/ci.yml/badge.svg)](https://github.com/VolvoxCommunity/Sobriety-Waypoint/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/VolvoxCommunity/Sobriety-Waypoint/graph/badge.svg?token=U4ILD582YD)](https://codecov.io/gh/VolvoxCommunity/Sobriety-Waypoint)

A cross-platform companion app that helps sponsors and sponsees stay connected, complete recovery program work, and celebrate sobriety milestones together. Think of it as Jira for your sobriety!

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture Snapshot](#architecture-snapshot)
- [Getting Started](#getting-started)
- [Common Commands](#common-development-commands)
- [Authentication](#authentication--identity-providers)
- [Testing](#testing)
- [CI/CD](#cicd--release-flow)
- [Docs](#documentation--helpful-links)

## Overview

Sobriety Waypoint helps people in recovery stay connected and accountable through structured task management, milestone tracking, and transparent progress visualization. Create tasks, complete them with private notes, and watch your sobriety journey unfold on a timeline that celebrates every step forward (and documents the tough moments, too).

**Everyone can be both a sponsor (helping others) and a sponsee (being helped) simultaneously.** There are no role restrictions - you can guide some people through their journey while receiving guidance from others.

### Highlights

- Flexible relationships: Be both a sponsor and sponsee in different connections
- Relationships linked through secure invite codes
- Step-aligned task assignments, reminders, and completion tracking
- Direct messaging with Row Level Security-backed privacy
- Sobriety day counters, relapse restart workflows, and milestone logging
- Full recovery program content with prompts and personal reflections
- Theme-aware UI (light/dark/system) with Expo Router navigation guardrails
- Runs on iOS, Android, and web from a single Expo codebase

## Tech Stack

- **Framework**: Expo 54 · React Native 0.81.5 · React 19
- **Routing**: Expo Router v6 with typed routes
- **Backend**: Supabase (Postgres + RLS) with typed client access
- **Auth**: Supabase Auth (email/password, Google OAuth, Apple Sign In design ready)
- **Storage**: SecureStore (native) / localStorage (web) via platform-aware adapter
- **Language / Tooling**: TypeScript 5.9 (strict), pnpm, ESLint 9, Prettier, Husky + lint-staged
- **Icons & UI**: lucide-react-native, custom theme context
- **Observability**: Sentry (all environments, auto source maps, privacy scrubbing)
- **Performance**: React Compiler enabled, New Architecture enabled

## Architecture Snapshot

- `app/`: Expo Router entry point + grouped routes (`(tabs)` for the authenticated experience)
- `contexts/`: Auth and Theme providers (root layout enforces auth/onboarding flow)
- `lib/supabase.ts`: typed Supabase client + platform storage adapter + session refresh
- `lib/logger.ts`: centralized logging with Sentry breadcrumbs integration
- `supabase/migrations/`: canonical schema, policies, and seed data
- `types/database.ts`: fully generated database types used throughout the app

```
Sobriety-Waypoint/
├── app/                    # Router, screens, layouts
│   ├── _layout.tsx         # Root layout with auth guards
│   ├── login.tsx           # Email/password + social sign in
│   ├── signup.tsx          # Registration flow
│   ├── onboarding.tsx      # Profile setup
│   ├── settings.tsx        # App settings
│   └── (tabs)/             # Authenticated tab navigation
│       ├── index.tsx       # Dashboard/home
│       ├── tasks.tsx       # Task list for sponsees
│       ├── manage-tasks.tsx# Task assignment for sponsors
│       ├── journey.tsx     # Timeline/milestone view
│       ├── steps.tsx       # 12-step program content
│       └── profile.tsx     # User profile
├── components/             # Shared UI components
├── contexts/               # AuthContext, ThemeContext
├── lib/                    # Supabase client, logger, utilities
├── types/                  # Database + domain models
├── supabase/               # SQL migrations, RLS policies
└── docs/                   # Testing, CI/CD, feature plans
```

## Getting Started

### Prerequisites

- Node.js 22+ and the latest pnpm
- Expo CLI (`npx expo` or global install)
- Xcode + iOS Simulator (macOS) for iOS builds
- Android Studio + SDK 33+ for Android builds

### Install & Configure

1. Clone and install dependencies
   ```bash
   git clone <repository-url>
   cd Sobriety-Waypoint
   pnpm install
   ```
2. Create `.env` in the project root
   ```env
   EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```
3. Provision Supabase
   1. Create a Supabase project
   2. Run SQL from `supabase/migrations/`
   3. Ensure all RLS policies match the repo migrations

### Run the App

```bash
pnpm start       # Expo dev server (web + native)
pnpm ios         # Launch iOS simulator (macOS only)
pnpm android     # Launch Android emulator/device
pnpm web         # Launch web version
pnpm build:web   # Static web build → dist/
```

## Common Development Commands

| Command                             | Description                                     |
| ----------------------------------- | ----------------------------------------------- |
| `pnpm typecheck`                    | TypeScript in no-emit mode (run before pushing) |
| `pnpm lint`                         | ESLint with Expo config                         |
| `pnpm format` / `pnpm format:check` | Prettier format or dry-run                      |
| `pnpm test`                         | Run all Jest tests                              |
| `pnpm test:watch`                   | Run tests in watch mode                         |
| `pnpm test:ci`                      | Run tests with coverage report                  |
| `pnpm start:clean`                  | Start with cleared Metro cache                  |
| `pnpm clean:metro`                  | Clear Metro bundler cache                       |
| `pnpm clean:all`                    | Nuclear option: clear everything and reinstall  |

> Husky + lint-staged run on every commit, formatting all staged files and linting TypeScript/JavaScript sources automatically. Skip only via `git commit -n`.

## Authentication & Identity Providers

- **Supabase Auth** powers all providers
- Email/password ready out of the box
- Google OAuth configured - see `docs/GOOGLE_OAUTH_SETUP.md` for setup guide
- Apple Sign In (iOS) - see `docs/APPLE_SIGNIN_SETUP.md` for setup guide
- Deep link scheme: `sobrietywaypoint://`
- Bundle IDs: `com.volvox.sobrietywaypoint` (iOS) / `com.volvox.sobrietywaypoint` (Android)
- Root layout enforces the flow: login → onboarding (profile + role) → authenticated tabs

## Observability & Privacy

- Sentry runs in all environments (development, preview, production)
- Environment tags help filter errors in Sentry dashboard
- Automatically scrubs sobriety dates, messages, and other sensitive data
- Source maps uploaded via EAS for readable native stack traces
- Centralized logger (`lib/logger.ts`) integrates with Sentry breadcrumbs
- Env vars required for production:
  ```
  EXPO_PUBLIC_SENTRY_DSN=<dsn>
  SENTRY_ORG=<org>
  SENTRY_PROJECT=<project>
  SENTRY_AUTH_TOKEN=<token>
  ```

## Testing

The project enforces **80% minimum coverage** across statements, branches, functions, and lines. Testing layers:

- **Unit & Integration**: Jest + React Native Testing Library
- **API mocking**: MSW (Mock Service Worker)

### Test Commands

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
pnpm test:ci       # Run with coverage report
```

## CI/CD & Release Flow

- GitHub Actions workflow runs on every push/PR (`.github/workflows/ci.yml`)
  - Lint → format check → typecheck
  - Web build (artifact stored for 7 days)
  - Android + iOS builds kicked off through EAS (preview profile)
  - Claude Code Review keeps a sticky PR comment with findings
- EAS profiles (`eas.json`)
  - `development`: Dev client for local testing
  - `preview`: CI/CD + QA (Release config, OTA channel `preview`)
  - `production`: Production-ready builds with auto version bump
- EAS Update enabled for over-the-air updates
- Secrets required in GitHub:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_TOKEN` (create via `expo.dev` → Access Tokens)
- Monitor native builds at [Expo builds dashboard](https://expo.dev/accounts/volvox-llc/projects/sobriety-waypoint/builds)

## Documentation & Helpful Links

- `CLAUDE.md` – architecture guidance + MCP usage expectations
- `docs/logger.md` – universal logger API reference and best practices
- `docs/GOOGLE_OAUTH_SETUP.md` – Google OAuth configuration guide
- `docs/APPLE_SIGNIN_SETUP.md` – Apple Sign In configuration guide

## License

Private and confidential. All rights reserved.
