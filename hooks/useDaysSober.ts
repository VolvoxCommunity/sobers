import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getDateDiffInDays } from '@/lib/date';
import { useAuth } from '@/contexts/AuthContext';
import type { SlipUp, Profile } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addDays } from 'date-fns';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface DaysSoberResult {
  /** Number of days in current sobriety streak */
  daysSober: number;
  /** Total days since original sobriety date (ignores slip-ups) */
  journeyDays: number;
  /** Original sobriety start date (ISO string) */
  journeyStartDate: string | null;
  /** Current streak start date - either recovery restart or original date */
  currentStreakStartDate: string | null;
  /** Whether user has any recorded slip-ups */
  hasSlipUps: boolean;
  /** Most recent slip-up record, if any */
  mostRecentSlipUp: SlipUp | null;
  /** Loading state for async operations */
  loading: boolean;
  /** Error from data fetching, if any */
  error: PostgrestError | Error | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculates the number of milliseconds until the next midnight in a specific timezone.
 *
 * This ensures the midnight refresh timer aligns with the user's profile timezone,
 * not the device's local timezone. This is critical for consistent day count updates
 * when users travel or have their device in a different timezone than their profile.
 *
 * @param timezone - IANA timezone string (e.g., 'America/Los_Angeles'). Defaults to device timezone
 * @returns Milliseconds until 00:00:00 of the next day in the specified timezone
 *
 * @example
 * ```ts
 * const ms = getMillisecondsUntilMidnight('America/Los_Angeles');
 * setTimeout(refresh, ms);
 * ```
 */
function getMillisecondsUntilMidnight(
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): number {
  const now = new Date();

  // Get current time in the target timezone
  const zonedNow = toZonedTime(now, timezone);
  
  // Calculate time until midnight in the target timezone
  const hoursUntilMidnight = 24 - zonedNow.getHours();
  const minutesUntilMidnight = 60 - zonedNow.getMinutes();
  const secondsUntilMidnight = 60 - zonedNow.getSeconds();
  const msUntilMidnight = 1000 - zonedNow.getMilliseconds();
  
  // Total milliseconds until midnight in timezone
  const msInTz = 
    (hoursUntilMidnight - 1) * 3600000 +
    (minutesUntilMidnight - 1) * 60000 +
    (secondsUntilMidnight - 1) * 1000 +
    msUntilMidnight;
  
  // We need to convert this to UTC time for setTimeout
  // Calculate what UTC time corresponds to midnight in the timezone
  const tomorrowZoned = addDays(zonedNow, 1);
  tomorrowZoned.setHours(0, 0, 0, 0);
  
  // Get tomorrow's date string to calculate the offset for that date
  const tomorrowDateStr = formatInTimeZone(tomorrowZoned, timezone, 'yyyy-MM-dd');
  const [year, month, day] = tomorrowDateStr.split('-').map(Number);
  
  // Create a test UTC time for tomorrow noon to get accurate offset
  const testUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const testZoned = toZonedTime(testUtc, timezone);
  const offsetForTomorrow = testUtc.getTime() - testZoned.getTime();
  
  // Create a UTC date representing midnight in the timezone
  // by taking midnight UTC and adjusting by the offset
  const midnightUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const midnightUtcForTz = new Date(midnightUtc.getTime() - offsetForTomorrow);
  
  return Math.max(1000, midnightUtcForTz.getTime() - now.getTime());
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Custom hook for tracking user's sobriety streak and journey duration.
 *
 * Automatically updates at midnight to ensure day counts stay accurate
 * even if the component remains mounted across date boundaries.
 *
 * @param userId - Optional user ID to fetch data for (defaults to current user)
 * @returns Object containing sobriety metrics, loading state, and error info
 *
 * @example
 * ```tsx
 * const { daysSober, journeyDays, hasSlipUps, loading } = useDaysSober();
 *
 * if (loading) return <Spinner />;
 *
 * return (
 *   <View>
 *     <Text>Current streak: {daysSober} days</Text>
 *     {hasSlipUps && <Text>Journey: {journeyDays} days</Text>}
 *   </View>
 * );
 * ```
 */
export function useDaysSober(userId?: string): DaysSoberResult {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PostgrestError | Error | null>(null);
  const [mostRecentSlipUp, setMostRecentSlipUp] = useState<SlipUp | null>(null);
  const [fetchedProfile, setFetchedProfile] = useState<Profile | null>(null);

  // State to trigger recalculation at midnight
  const [currentDate, setCurrentDate] = useState(() => new Date().toDateString());

  const targetUserId = userId || user?.id;
  const isCurrentUser = !userId || userId === user?.id;
  const targetProfile = isCurrentUser ? profile : fetchedProfile;

  // Ref to track the active midnight refresh timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get the timezone to use (from profile or device default)
  const timezone = useMemo(() => {
    return targetProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [targetProfile?.timezone]);

  // Set up midnight refresh timer - reschedules when timezone changes
  useEffect(() => {
    /**
     * Schedules a state update at midnight in the user's profile timezone
     * to trigger day count recalculation. Reschedules itself for the following
     * midnight after each update.
     */
    function scheduleMidnightRefresh(): void {
      const msUntilMidnight = getMillisecondsUntilMidnight(timezone);

      timerRef.current = setTimeout(() => {
        setCurrentDate(new Date().toDateString());
        // Schedule next midnight refresh
        scheduleMidnightRefresh();
      }, msUntilMidnight);
    }

    scheduleMidnightRefresh();

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timezone]);

  // Fetch slip-up and profile data
  useEffect(() => {
    async function fetchData() {
      if (!targetUserId) {
        setMostRecentSlipUp(null);
        setFetchedProfile(null);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch profile if not current user
        if (!isCurrentUser) {
          setFetchedProfile(null); // Clear old profile first

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();

          if (profileError) throw profileError;
          setFetchedProfile(profileData);
        }

        // Fetch most recent slip-up
        const { data, error: fetchError } = await supabase
          .from('slip_ups')
          .select('*')
          .eq('user_id', targetUserId)
          .order('slip_up_date', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        setMostRecentSlipUp(data && data.length > 0 ? data[0] : null);
      } catch (err) {
        setError(err as PostgrestError | Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [targetUserId, isCurrentUser, profile, user?.id]);

  // Calculate day counts - recalculates when date changes at midnight
  const result = useMemo(() => {
    const sobrietyDate = targetProfile?.sobriety_date;

    // Determine which date to use for streak calculation
    let streakStartDate: string | null = null;
    if (mostRecentSlipUp) {
      streakStartDate = mostRecentSlipUp.recovery_restart_date;
    } else if (sobrietyDate) {
      streakStartDate = sobrietyDate;
    }

    // Get timezone for calculations (use profile timezone or device default)
    const calcTimezone = targetProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Calculate days in current streak
    // Pass date strings directly so they're parsed as midnight in the user's timezone
    let daysSober = 0;
    if (streakStartDate) {
      daysSober = getDateDiffInDays(streakStartDate, new Date(), calcTimezone);
    }

    // Calculate total journey days from original sobriety date
    let journeyDays = 0;
    if (sobrietyDate) {
      journeyDays = getDateDiffInDays(sobrietyDate, new Date(), calcTimezone);
    }

    return {
      daysSober,
      journeyDays,
      journeyStartDate: sobrietyDate || null,
      currentStreakStartDate: streakStartDate,
      hasSlipUps: mostRecentSlipUp !== null,
      mostRecentSlipUp,
      loading,
      error,
    };
  }, [mostRecentSlipUp, targetProfile, loading, error, currentDate]);

  return result;
}
