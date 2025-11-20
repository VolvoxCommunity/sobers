# Project Structure

## Directory Layout

```
Sobriety-Waypoint/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx        # Root layout with auth guards
│   ├── login.tsx          # Login screen
│   ├── signup.tsx         # Signup screen
│   ├── onboarding.tsx     # Profile setup
│   ├── +not-found.tsx     # 404 handler
│   └── (tabs)/            # Authenticated tab navigation
│       ├── _layout.tsx    # Tab bar configuration
│       ├── index.tsx      # Dashboard/home
│       ├── tasks.tsx      # Task list (sponsee view)
│       ├── manage-tasks.tsx  # Task assignment (sponsor view)
│       ├── journey.tsx    # Timeline/milestones
│       ├── steps.tsx      # 12-step content
│       └── profile.tsx    # User profile/settings
│
├── components/            # Shared UI components
│   └── ErrorBoundary.tsx # Error handling wrapper
│
├── contexts/              # React Context providers
│   ├── AuthContext.tsx   # Authentication & user session
│   └── ThemeContext.tsx  # Theme switching (light/dark)
│
├── hooks/                 # Custom React hooks
│   └── useFrameworkReady.ts
│
├── lib/                   # Core utilities & integrations
│   ├── supabase.ts       # Supabase client + storage adapter
│   ├── sentry.ts         # Sentry initialization
│   ├── sentry-privacy.ts # PII scrubbing configuration
│   └── validation.ts     # Shared validation logic
│
├── types/                 # TypeScript type definitions
│   └── database.ts       # Supabase schema types (canonical)
│
├── styles/                # Shared theme constants
│
├── assets/                # Static assets (images, icons)
│   └── images/
│
├── test-utils/            # Testing utilities
│   └── fixtures/         # Test data fixtures
│
├── __mocks__/            # MSW mock handlers
│
├── .maestro/             # E2E test flows
│
├── .github/              # CI/CD workflows
│   └── workflows/ci.yml
│
├── scripts/              # Build/utility scripts
│
└── dist/                 # Web build output (generated)
```

## Key Files

- `app.config.ts` - Expo configuration (bundle IDs, plugins, EAS project)
- `tsconfig.json` - TypeScript configuration (strict mode, path aliases)
- `eslint.config.js` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `package.json` - Dependencies and scripts
- `.env` - Environment variables (not committed)
- `.env.example` - Environment template
- `CLAUDE.md` - AI assistant guidance

## Routing Architecture

- **File-based routing** via Expo Router
- Routes map to files in `app/` directory
- Route groups: `(tabs)/` for authenticated navigation
- Layout files (`_layout.tsx`) define nested navigation
- Typed routes enabled in `app.config.ts`

## Authentication Flow (enforced in `app/_layout.tsx`)

1. Unauthenticated user → `/login`
2. User without profile → `/onboarding`
3. User with incomplete profile → `/onboarding`
4. Complete user → `/(tabs)` (main app)

## Data Flow

- Supabase client (`lib/supabase.ts`) → single source for all DB operations
- Database types (`types/database.ts`) → used throughout app
- Context providers wrap root layout
- Components consume contexts via hooks (`useAuth`, `useTheme`)
