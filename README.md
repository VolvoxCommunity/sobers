# Sobers

[![CI](https://github.com/VolvoxCommunity/sobers/actions/workflows/ci.yml/badge.svg)](https://github.com/VolvoxCommunity/sobers/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/VolvoxCommunity/sobers/graph/badge.svg?token=U4ILD582YD)](https://codecov.io/gh/VolvoxCommunity/sobers)

A cross-platform recovery companion app connecting sponsors and sponsees through task management, milestone tracking, and progress visualization. _Think Jira for your sobriety._

## Features

- **Flexible roles** - Be both sponsor and sponsee simultaneously
- **Task management** - Step-aligned assignments with completion tracking
- **Sobriety tracking** - Day counters, milestones, relapse restart workflows
- **12-step content** - Full program with prompts and personal reflections
- **Secure messaging** - RLS-backed privacy for all communications
- **Cross-platform** - iOS, Android, and web from a single codebase

## Tech Stack

| Layer     | Tech                                        |
| --------- | ------------------------------------------- |
| Framework | Expo 54, React Native 0.81.5, React 19      |
| Routing   | Expo Router v6 (typed routes)               |
| Backend   | Supabase (Postgres + RLS)                   |
| Auth      | Email/password, Google OAuth, Apple Sign In |
| Language  | TypeScript 5.9 (strict)                     |
| Tooling   | pnpm, ESLint 9, Prettier, Husky             |

## Quick Start

```bash
# Install
git clone <repository-url> && cd Sobers && pnpm install

# Configure .env
EXPO_PUBLIC_SUPABASE_URL=<your-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-key>

# Run
pnpm web      # Web
pnpm ios      # iOS Simulator
pnpm android  # Android
```

## Commands

| Command            | Description                  |
| ------------------ | ---------------------------- |
| `pnpm dev`         | Start Expo dev server        |
| `pnpm typecheck`   | TypeScript check             |
| `pnpm lint`        | ESLint                       |
| `pnpm format`      | Prettier                     |
| `pnpm test`        | Jest (80% coverage required) |
| `pnpm build:web`   | Static web build             |
| `pnpm start:clean` | Clear Metro cache            |

## Project Structure

```
app/                    # Expo Router screens
├── _layout.tsx         # Root layout with auth guards
├── login.tsx / signup.tsx
├── onboarding.tsx
└── (app)/              # Authenticated group
    └── (tabs)/         # Tab navigation
        ├── index.tsx   # Dashboard
        ├── tasks.tsx   # Task list
        ├── journey.tsx # Timeline
        └── profile.tsx
contexts/               # AuthContext, ThemeContext
lib/                    # Supabase client, logger
types/                  # Database types
supabase/               # SQL migrations
```

## Auth Flow

`login` → `onboarding` (profile setup) → `(tabs)` (authenticated)

Deep link scheme: `sobers://`

## CI/CD

- GitHub Actions: lint → format → typecheck → build → test
- EAS profiles: `development`, `preview`, `production`
- Claude Code Review on PRs

## Docs

- `CLAUDE.md` - Development workflow & architecture
- `docs/GOOGLE_OAUTH_SETUP.md` - Google OAuth setup
- `docs/APPLE_SIGNIN_SETUP.md` - Apple Sign In setup
- `docs/logger.md` - Logging API reference

## License

Private and confidential. All rights reserved.
