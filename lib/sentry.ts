import React from 'react';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { privacyBeforeSend, privacyBeforeBreadcrumb } from './sentry-privacy';

/**
 * Navigation integration for Expo Router
 * Exported so it can be registered in app/_layout.tsx with navigationRef
 */
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

/**
 * Check if Sentry should be initialized.
 * Sentry is initialized in all environments to capture errors during development and testing.
 *
 * @returns true if DSN is configured, false otherwise
 */
function shouldInitialize(): boolean {
  // Verify DSN is available
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
    // Note: Console used here to avoid circular dependency (logger imports Sentry)

    console.warn('[Sentry] DSN not configured, skipping initialization');
    return false;
  }

  return true;
}

/**
 * Get the current environment name for Sentry.
 *
 * @returns Environment string: 'development', 'preview', or 'production'
 */
function getEnvironment(): string {
  if (__DEV__) {
    return 'development';
  }
  return process.env.EXPO_PUBLIC_APP_ENV || 'production';
}

/**
 * Initialize Sentry with platform-specific configuration
 *
 * Note: This function uses console.log/error directly to avoid circular dependency,
 * as the logger module imports Sentry. These are the only allowed console calls
 * in production code.
 */
export function initializeSentry(): void {
  if (!shouldInitialize()) {
    return;
  }

  const environment = getEnvironment();
  console.log(`[Sentry] Initializing for environment: ${environment}`);

  try {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      environment,

      enableLogs: true,

      // Release tracking
      release: Constants.expoConfig?.version || '1.0.0',
      dist: Constants.expoConfig?.extra?.eas?.buildNumber,

      // Adds more context data to events (IP address, cookies, user, etc.)
      sendDefaultPii: true,

      // Session tracking
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,

      // Tracing Configuration
      enableUserInteractionTracing: true,
      enableNativeFramesTracking: true,
      tracesSampleRate: 1.0,

      // Configure Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1,

      // Integrations
      integrations: [
        navigationIntegration,
        Sentry.mobileReplayIntegration(),
        Sentry.feedbackIntegration(),
      ],

      // Spotlight Configuration
      spotlight: __DEV__,

      // Privacy hooks
      beforeSend: privacyBeforeSend,
      beforeBreadcrumb: privacyBeforeBreadcrumb,

      // Error sampling (100% of errors)
      sampleRate: 1.0,
    });

    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Set user context for Sentry events
 */
export function setSentryUser(userId: string): void {
  if (!shouldInitialize()) return;

  Sentry.setUser({
    id: userId,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
  if (!shouldInitialize()) return;
  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry events
 */
export function setSentryContext(name: string, context: Record<string, any>): void {
  if (!shouldInitialize()) return;
  Sentry.setContext(name, context);
}

/**
 * Conditionally wrap root component with Sentry error boundary
 * Only applies in production builds
 */
export function wrapRootComponent<T extends React.ComponentType<any>>(component: T): T {
  if (!shouldInitialize()) return component;
  return Sentry.wrap(component) as T;
}

/**
 * Manually capture an exception
 */
export function captureSentryException(error: Error, context?: Record<string, any>): void {
  if (!shouldInitialize()) return;

  Sentry.captureException(error, {
    contexts: context,
  });
}
