/**
 * Developer Tools Context
 *
 * Provides development-only utilities for testing and debugging.
 * Only active when __DEV__ is true - no-ops in production.
 *
 * @module contexts/DevToolsContext
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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

  /** Whether offline mode is simulated */
  offlineMode: boolean;
  /** Toggle offline mode simulation */
  setOfflineMode: (enabled: boolean) => void;

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
 * Provider for developer tools context.
 * Only provides actual functionality in __DEV__ mode.
 */
export function DevToolsProvider({ children }: DevToolsProviderProps) {
  const [verboseLogging, setVerboseLogging] = useState(false);
  const [sobrietyDateOverride, setSobrietyDateOverride] = useState<string | null>(null);
  const [timeTravelDays, setTimeTravelDays] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const [analyticsDebug, setAnalyticsDebug] = useState(
    process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === 'true'
  );

  const getCurrentDate = useCallback(() => {
    const now = new Date();
    if (timeTravelDays !== 0) {
      now.setDate(now.getDate() + timeTravelDays);
    }
    return now;
  }, [timeTravelDays]);

  const resetAll = useCallback(() => {
    setVerboseLogging(false);
    setSobrietyDateOverride(null);
    setTimeTravelDays(0);
    setOfflineMode(false);
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
      offlineMode,
      setOfflineMode,
      analyticsDebug,
      setAnalyticsDebug,
      getCurrentDate,
      resetAll,
    }),
    [
      verboseLogging,
      sobrietyDateOverride,
      timeTravelDays,
      offlineMode,
      analyticsDebug,
      getCurrentDate,
      resetAll,
    ]
  );

  return <DevToolsContext.Provider value={value}>{children}</DevToolsContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access developer tools.
 * Returns no-op functions in production for safety.
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
      offlineMode: false,
      setOfflineMode: () => {},
      analyticsDebug: false,
      setAnalyticsDebug: () => {},
      getCurrentDate: () => new Date(),
      resetAll: () => {},
    };
  }

  return context;
}
