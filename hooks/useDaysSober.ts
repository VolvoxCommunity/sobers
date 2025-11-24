import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { SlipUp, Profile } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

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
 * Calculates the number of milliseconds until the next midnight.
 *
 * @returns Milliseconds until 00:00:00 of the next day
 *
 * @example
 * ```ts
 * const ms = getMillisecondsUntilMidnight();
 * setTimeout(refresh, ms);
 * ```
 */
function getMillisecondsUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

/**
 * Calculates the difference in days between two dates.
 *
 * @param startDate - The earlier date
 * @param endDate - The later date (defaults to now)
 * @returns Number of full days between dates, minimum 0
 */
function calculateDaysDifference(startDate: Date, endDate: Date = new Date()): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
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

  // Set up midnight refresh timer
  useEffect(() => {
    /**
     * Schedules a state update at midnight to trigger day count recalculation.
     * Reschedules itself for the following midnight after each update.
     */
    function scheduleMidnightRefresh(): ReturnType<typeof setTimeout> {
      const msUntilMidnight = getMillisecondsUntilMidnight();

      return setTimeout(() => {
        setCurrentDate(new Date().toDateString());
        // Schedule next midnight refresh
        scheduleMidnightRefresh();
      }, msUntilMidnight);
    }

    const timerId = scheduleMidnightRefresh();

    return () => clearTimeout(timerId);
  }, []);

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

    // Calculate days in current streak
    let daysSober = 0;
    if (streakStartDate) {
      daysSober = calculateDaysDifference(new Date(streakStartDate));
    }

    // Calculate total journey days from original sobriety date
    let journeyDays = 0;
    if (sobrietyDate) {
      journeyDays = calculateDaysDifference(new Date(sobrietyDate));
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
