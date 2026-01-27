<p align="center">
  <img src="assets/images/banner.png" alt="Sobers" width="100%" />
</p>

<h1 align="center">Sobers</h1>

<p align="center">
  <a href="https://github.com/VolvoxCommunity/sobers/actions/workflows/ci.yml"><img src="https://github.com/VolvoxCommunity/sobers/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://codecov.io/gh/VolvoxCommunity/sobers"><img src="https://codecov.io/gh/VolvoxCommunity/sobers/graph/badge.svg?token=U4ILD582YD" alt="codecov" /></a>
  <a href="https://zread.ai/VolvoxCommunity/sobers" target="_blank"><img src="https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff" alt="zread"/></a>
</p>

<p align="center">
  <i>A cross-platform recovery companion app connecting sponsors and sponsees through task management, milestone tracking, and progress visualization.</i>
</p>

<p align="center">
  <b>Think Jira for your sobriety.</b>
</p>

<p align="center">
  <img src="docs/screenshots/dashboard.png" width="180" alt="Dashboard" />
  <img src="docs/screenshots/steps.png" width="180" alt="Steps" />
  <img src="docs/screenshots/journey.png" width="180" alt="Journey" />
  <img src="docs/screenshots/profile.png" width="180" alt="Profile" />
</p>

## Features

- **Dual roles** - Be both sponsor and sponsee simultaneously
- **Task management** - Assign and track step-aligned recovery work
- **Sobriety tracking** - Day counters, milestones, savings calculator
- **12-step content** - Full program with reflection prompts
- **Privacy-first** - Row-level security for all data
- **Cross-platform** - iOS, Android, and web

## Tech Stack

| Layer     | Tech                                         |
| --------- | -------------------------------------------- |
| Framework | Expo 54, React Native 0.81, React 19         |
| Routing   | Expo Router v6 (file-based, typed routes)    |
| Backend   | Supabase (Postgres + Row Level Security)     |
| Auth      | Email/password, Google OAuth, Apple Sign-In  |
| Language  | TypeScript 5.9 (strict mode)                 |
| Testing   | Jest 29, Playwright (E2E)                    |
| Tooling   | pnpm, ESLint 9, Prettier, Husky, lint-staged |

## Quick Start

```bash
# Install
git clone <repository-url> && cd Sobers && pnpm install

# Configure .env
EXPO_PUBLIC_SUPABASE_URL=<your-url>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-key>

# Run
pnpm web      # Web
pnpm ios      # iOS Simulator
pnpm android  # Android
```

## Commands

| Command            | Description                   |
| ------------------ | ----------------------------- |
| `pnpm dev`         | Start Expo + Supabase         |
| `pnpm web`         | Start web dev server          |
| `pnpm ios`         | Run on iOS Simulator          |
| `pnpm android`     | Run on Android                |
| `pnpm test`        | Run Jest tests (80% coverage) |
| `pnpm test:e2e`    | Run Playwright E2E tests      |
| `pnpm typecheck`   | TypeScript type checking      |
| `pnpm lint`        | ESLint                        |
| `pnpm format`      | Prettier formatting           |
| `pnpm build:web`   | Build static web export       |
| `pnpm start:clean` | Clear Metro cache and restart |

## Project Structure

```
app/                      # Expo Router screens
├── _layout.tsx           # Root layout with auth guards
├── login.tsx             # Login screen
├── signup.tsx            # Sign up screen
├── onboarding.tsx        # New user onboarding
└── (app)/                # Authenticated group
    └── (tabs)/           # Tab navigation
        ├── index.tsx     # Dashboard (home)
        ├── tasks.tsx     # Task management
        ├── journey.tsx   # Recovery timeline
        ├── profile.tsx   # User profile
        └── steps/        # 12-step content
components/               # Reusable UI components
contexts/                 # AuthContext, ThemeContext
hooks/                    # Custom React hooks
lib/                      # Utilities (supabase, logger, etc.)
types/                    # TypeScript types
supabase/                 # Database migrations
e2e/                      # Playwright E2E tests
__tests__/                # Jest unit tests
```

## Auth Flow

```
login/signup → onboarding (first-time setup) → (tabs) main app
```

Deep link scheme: `sobers://`

## CI/CD

- **GitHub Actions**: lint → typecheck → build → test (80% coverage gate)
- **EAS Build**: `development`, `preview`, `production` profiles
- **Automated PR reviews** via Claude Code

## Documentation

| Doc                                                        | Description                         |
| ---------------------------------------------------------- | ----------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                                   | Development workflow & architecture |
| [`docs/GOOGLE_OAUTH_SETUP.md`](docs/GOOGLE_OAUTH_SETUP.md) | Google OAuth configuration          |
| [`docs/APPLE_SIGNIN_SETUP.md`](docs/APPLE_SIGNIN_SETUP.md) | Apple Sign-In configuration         |
| [`docs/logger.md`](docs/logger.md)                         | Logging API reference               |

## License

Private and confidential. All rights reserved.
