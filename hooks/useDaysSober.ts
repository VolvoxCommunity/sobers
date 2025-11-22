import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { SlipUp, Profile } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

export interface DaysSoberResult {
  daysSober: number;
  journeyStartDate: string | null;
  currentStreakStartDate: string | null;
  hasSlipUps: boolean;
  mostRecentSlipUp: SlipUp | null;
  loading: boolean;
  error: PostgrestError | Error | null;
}

export function useDaysSober(userId?: string): DaysSoberResult {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PostgrestError | Error | null>(null);
  const [mostRecentSlipUp, setMostRecentSlipUp] = useState<SlipUp | null>(null);
  const [fetchedProfile, setFetchedProfile] = useState<Profile | null>(null);

  const targetUserId = userId || user?.id;
  const isCurrentUser = !userId || userId === user?.id;
  const targetProfile = isCurrentUser ? profile : fetchedProfile;

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

  const result = useMemo(() => {
    const sobrietyDate = targetProfile?.sobriety_date;

    // Determine which date to use for calculation
    let calculationDate: string | null = null;
    if (mostRecentSlipUp) {
      calculationDate = mostRecentSlipUp.recovery_restart_date;
    } else if (sobrietyDate) {
      calculationDate = sobrietyDate;
    }

    // Calculate days sober
    let daysSober = 0;
    if (calculationDate) {
      const startDate = new Date(calculationDate);
      const today = new Date();
      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Prevent negative days (future dates)
      daysSober = Math.max(0, diffDays);
    }

    return {
      daysSober,
      journeyStartDate: sobrietyDate || null,
      currentStreakStartDate: calculationDate,
      hasSlipUps: mostRecentSlipUp !== null,
      mostRecentSlipUp,
      loading,
      error,
    };
  }, [mostRecentSlipUp, targetProfile, loading, error]);

  return result;
}
