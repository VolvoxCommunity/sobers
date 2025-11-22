# Sobriety Waypoint

![License](https://img.shields.io/badge/license-MIT-blue.svg)
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)](https://expo.dev/accounts/BillChirico/projects/sobriety-waypoint)

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

Sobriety Waypoint helps sponsors and sponsees stay connected and accountable through structured task management, milestone tracking, and transparent progress visualization. Create tasks, complete them with private notes, and watch your sobriety journey unfold on a timeline that celebrates every step forward (and documents the tough moments, too).

### Highlights

- Sponsor-sponsee relationships linked through invite codes
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
- **Language / Tooling**: TypeScript (strict), pnpm, ESLint, Prettier, Husky + lint-staged
- **Icons & UI**: lucide-react-native, custom theme context
- **Observability**: Sentry (prod only, auto source maps, privacy scrubbing)

## Architecture Snapshot

- `app/`: Expo Router entry point + grouped routes (`(tabs)` for the authenticated experience)
- `contexts/`: Auth and Theme providers (root layout enforces auth/onboarding flow)
- `lib/supabase.ts`: typed Supabase client + platform storage adapter + session refresh
- `supabase/migrations/`: canonical schema, policies, and seed data
- `types/database.ts`: fully generated database types used throughout the app

```
Sobriety-Waypoint/
├── app/ (router, screens, layouts)
├── components/ (shared UI)
├── contexts/ (AuthContext, ThemeContext)
├── lib/ (Supabase client, utilities)
├── types/ (database + domain models)
├── supabase/ (SQL migrations, RLS policies)
└── docs/ (testing, CI/CD, feature plans)
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
pnpm dev        # Expo dev server (web + native)
pnpm ios        # Launch iOS simulator (macOS only)
pnpm android    # Launch Android emulator/device
pnpm build:web  # Static web build → dist/
```

## Common Development Commands

| Command                                                   | Description                                     |
| --------------------------------------------------------- | ----------------------------------------------- |
| `pnpm typecheck`                                          | TypeScript in no-emit mode (run before pushing) |
| `pnpm lint`                                               | ESLint with Expo config                         |
| `pnpm format` / `pnpm format:check`                       | Prettier format or dry-run                      |
| `pnpm maestro`                                            | Run all Maestro E2E flows                       |
| `pnpm test`, `pnpm test:watch`, `pnpm test -- --coverage` | Jest test runners                               |

> Husky + lint-staged run on every commit, formatting all staged files and linting TypeScript/JavaScript sources automatically. Skip only via `git commit -n`.

## Authentication & Identity Providers

- **Supabase Auth** powers all providers
- Email/password ready out of the box
- Google OAuth setup documented in `GOOGLE_OAUTH_SETUP.md`
- Apple Sign In design lives in `docs/plans/2025-11-12-apple-signin-design.md`
- Deep link scheme: `sobrietywaypoint://`
- Bundle IDs: `com.volvox.sobrietywaypoint` (iOS) / `com.volvox.sobrietywaypoint` (Android)
- Root layout enforces the flow: login → onboarding (profile + role) → authenticated tabs

## Observability & Privacy

- Sentry runs in production builds only (disabled in dev)
- Automatically scrubs sobriety dates, messages, and other sensitive data
- Source maps uploaded via EAS for readable native stack traces
- Env vars required for production:
  ```
  EXPO_PUBLIC_SENTRY_DSN=<dsn>
  SENTRY_ORG=<org>
  SENTRY_PROJECT=<project>
  SENTRY_AUTH_TOKEN=<token>
  ```
- See `docs/SENTRY_SETUP.md` for full setup + CI integration

## Testing

The project enforces **80% minimum coverage** across statements, branches, functions, and lines. Testing layers:

- **Unit & Integration**: Jest + React Native Testing Library + custom `renderWithProviders`
- **API mocking**: MSW handlers under `mocks/`
- **Fixtures**: `test-utils/fixtures/`
- **E2E**: Maestro flows stored in `.maestro/`

### Test Commands

```bash
pnpm test               # all tests
pnpm test:watch         # watch mode
pnpm test -- --coverage # coverage report
pnpm maestro            # run Maestro flows
pnpm maestro:record     # record new flow
```

Templates live in `docs/templates/` for components, hooks, integration tests, and Maestro flows.

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
- Secrets required in GitHub:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_TOKEN` (create via `expo.dev` → Access Tokens)
- Monitor native builds at [Expo builds dashboard](https://expo.dev/accounts/BillChirico/projects/sobriety-waypoint/builds)

## Documentation & Helpful Links

- `CLAUDE.md` – architecture guidance + MCP usage expectations
- `docs/TESTING.md` – testing strategies, coverage targets, MSW patterns
- `.github/CICD.md` – CI/CD deep dive + Claude review notes
- `.github/GIT_HOOKS.md` – Husky/lint-staged troubleshooting
- `GOOGLE_OAUTH_SETUP.md`, `docs/plans/2025-11-12-apple-signin-design.md`
- `supabase/migrations/` – schema + RLS source of truth

## License

Private and confidential. All rights reserved.
