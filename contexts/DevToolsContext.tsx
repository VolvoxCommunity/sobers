/**
 * Developer Tools Context
 *
 * Provides development-only utilities for testing and debugging.
 * Only active when __DEV__ is true - no-ops in production.
 *
 * @module contexts/DevToolsContext
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { setVerboseLogging as setLoggerVerboseLogging } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

interface DevToolsContextType {
  /** Whether verbose logging is enabled */
  verboseLogging: boolean;
  /** Toggle verbose logging on/off */
  setVerboseLogging: (enabled: boolean) => void;

  /** Override for sobriety date (ISO string or null) */
  sobrietyDateOverride: string | null;
  /** Set sobriety date override for testing */
  setSobrietyDateOverride: (date: string | null) => void;

  /** Number of days to add to current date (time travel) */
  timeTravelDays: number;
  /** Set time travel days offset */
  setTimeTravelDays: (days: number) => void;

  /** Whether analytics debug mode is enabled */
  analyticsDebug: boolean;
  /** Toggle analytics debug mode */
  setAnalyticsDebug: (enabled: boolean) => void;

  /** Get the effective "current" date (with time travel applied) */
  getCurrentDate: () => Date;

  /** Reset all dev tools to defaults */
  resetAll: () => void;
}

// =============================================================================
// Context
// =============================================================================

const DevToolsContext = createContext<DevToolsContextType | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface DevToolsProviderProps {
  children: React.ReactNode;
}

/**
 * Provides the DevTools context to descendants, enabling development-only controls for verbose logging, analytics debug, sobriety date override, and time-traveling the current date.
 *
 * In production or when the context is not consumed, consumers receive safe no-op defaults; real functionality is active only in __DEV__.
 *
 * @param children - Content that will have access to the DevTools context
 */
export function DevToolsProvider({ children }: DevToolsProviderProps) {
  const [verboseLogging, setVerboseLogging] = useState(true);
  const [sobrietyDateOverride, setSobrietyDateOverride] = useState<string | null>(null);
  const [timeTravelDays, setTimeTravelDays] = useState(0);
  const [analyticsDebug, setAnalyticsDebug] = useState(
    process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === 'true'
  );

  // Sync verbose logging state with the logger module
  useEffect(() => {
    setLoggerVerboseLogging(verboseLogging);
  }, [verboseLogging]);

  const getCurrentDate = useCallback(() => {
    const now = new Date();
    if (timeTravelDays !== 0) {
      now.setDate(now.getDate() + timeTravelDays);
    }
    return now;
  }, [timeTravelDays]);

  const resetAll = useCallback(() => {
    setVerboseLogging(true);
    setSobrietyDateOverride(null);
    setTimeTravelDays(0);
    setAnalyticsDebug(process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === 'true');
  }, []);

  const value = useMemo(
    () => ({
      verboseLogging,
      setVerboseLogging,
      sobrietyDateOverride,
      setSobrietyDateOverride,
      timeTravelDays,
      setTimeTravelDays,
      analyticsDebug,
      setAnalyticsDebug,
      getCurrentDate,
      resetAll,
    }),
    [verboseLogging, sobrietyDateOverride, timeTravelDays, analyticsDebug, getCurrentDate, resetAll]
  );

  return <DevToolsContext.Provider value={value}>{children}</DevToolsContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Provides access to the DevTools context when available in development.
 *
 * @returns The DevTools context containing dev-only state, setters, `getCurrentDate`, and `resetAll`; in production or when the context is unavailable, a safe default object with no-op setters, `getCurrentDate()` returning the real current date, and default state values.
 */
export function useDevTools(): DevToolsContextType {
  const context = useContext(DevToolsContext);

  // In production or if context is not available, return no-op defaults
  if (!__DEV__ || !context) {
    return {
      verboseLogging: false,
      setVerboseLogging: () => {},
      sobrietyDateOverride: null,
      setSobrietyDateOverride: () => {},
      timeTravelDays: 0,
      setTimeTravelDays: () => {},
      analyticsDebug: false,
      setAnalyticsDebug: () => {},
      getCurrentDate: () => new Date(),
      resetAll: () => {},
    };
  }

  return context;
}