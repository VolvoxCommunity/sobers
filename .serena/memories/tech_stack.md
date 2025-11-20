# Tech Stack

## Core Framework
- **Expo 54** with React Native 0.81.5
- **React 19.1.0** (latest)
- **TypeScript 5.9** (strict mode enabled)
- **Node.js 22+** required
- **pnpm** for package management

## Routing & Navigation
- **Expo Router v6** with typed routes (file-based routing)
- React Navigation v7 (under the hood)

## Backend & Database
- **Supabase** (Postgres + Row Level Security)
- Typed client via `@supabase/supabase-js`
- Real-time subscriptions available

## Authentication
- **Supabase Auth** with multiple providers:
  - Email/password
  - Google OAuth
  - Facebook Sign In
  - Apple Sign In (design phase)
- Deep linking: `sobrietywaypoint://` scheme

## Storage
- **expo-secure-store** (native platforms)
- **localStorage** (web)
- Platform-aware adapter in `lib/supabase.ts`

## State Management
- React Context API (no Redux/Zustand)
- AuthContext for user session/profile
- ThemeContext for theme switching

## UI & Icons
- **lucide-react-native** for icons
- Custom theme context (light/dark/system)
- JetBrains Mono font family

## Observability
- **Sentry** (production only)
- Automatic source maps via EAS
- PII scrubbing configured
- Session replay and feedback integration

## Development Tools
- ESLint with expo config + prettier
- Husky + lint-staged for pre-commit hooks
- Jest for testing
- Maestro for E2E tests
- EAS Build for native builds

## Bundle Configuration
- iOS: `com.volvox.sobrietywaypoint`
- Android: `com.volvox.sobrietywaypoint`
- React Compiler enabled (experimental)
- New Architecture enabled
