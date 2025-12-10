import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useDaysSober } from '@/hooks/useDaysSober';
import {
  Heart,
  Share2,
  QrCode,
  UserMinus,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Settings,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { SponsorSponseeRelationship } from '@/types/database';
import { logger, LogCategory } from '@/lib/logger';
import { formatDateWithTimezone, parseDateAsLocal, getUserTimezone } from '@/lib/date';
import { useRouter } from 'expo-router';

/**
 * Renders a card for a sponsee showing avatar, display name, connection date, optional sobriety days and task completion, and a disconnect control.
 *
 * @param relationship - Sponsor/sponsee relationship object; component reads `relationship.sponsee`, `relationship.connected_at`, and `relationship.sponsee.sobriety_date` when present.
 * @param theme - Current theme object used for styling.
 * @param onDisconnect - Callback invoked when the user presses the Disconnect button.
 * @param taskStats - Optional task statistics for the sponsee with `total` and `completed` counts.
 *
 * @returns The JSX element rendering the sponsee relationship card.
 */
function SponseeDaysDisplay({
  relationship,
  theme,
  onDisconnect,
  taskStats,
}: {
  relationship: SponsorSponseeRelationship;
  theme: ReturnType<typeof useTheme>['theme'];
  onDisconnect: () => void;
  taskStats?: { total: number; completed: number };
}) {
  const { daysSober } = useDaysSober(relationship.sponsee_id);

  return (
    <View style={createStyles(theme).relationshipCard}>
      <View style={createStyles(theme).relationshipHeader}>
        <View style={createStyles(theme).avatar}>
          <Text style={createStyles(theme).avatarText}>
            {(relationship.sponsee?.display_name || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={createStyles(theme).relationshipInfo}>
          <Text style={createStyles(theme).relationshipName}>
            {relationship.sponsee?.display_name ?? '?'}
          </Text>
          <Text style={createStyles(theme).relationshipMeta}>
            Connected {new Date(relationship.connected_at).toLocaleDateString()}
          </Text>
          {relationship.sponsee?.sobriety_date && (
            <View style={createStyles(theme).sobrietyInfo}>
              <Heart size={14} color={theme.primary} fill={theme.primary} />
              <Text style={createStyles(theme).sobrietyText}>{daysSober} days sober</Text>
            </View>
          )}
          {taskStats && (
            <View style={createStyles(theme).taskStatsInfo}>
              <CheckCircle size={14} color={theme.success} />
              <Text style={createStyles(theme).taskStatsText}>
                {taskStats.completed}/{taskStats.total} tasks completed
              </Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity style={createStyles(theme).disconnectButton} onPress={onDisconnect}>
        <UserMinus size={18} color={theme.danger} />
        <Text style={createStyles(theme).disconnectText}>Disconnect</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Render a card showing a sponsor's avatar, connection date, optional sobriety info, and a disconnect action.
 *
 * @param relationship - Sponsor-sponsee relationship object providing sponsor display_name, sobriety_date, and connected_at
 * @param theme - Theme object used to style the card
 * @param onDisconnect - Callback invoked when the Disconnect button is pressed
 * @returns A React element representing the sponsor relationship card
 */
function SponsorDaysDisplay({
  relationship,
  theme,
  onDisconnect,
}: {
  relationship: SponsorSponseeRelationship;
  theme: ReturnType<typeof useTheme>['theme'];
  onDisconnect: () => void;
}) {
  const { daysSober } = useDaysSober(relationship.sponsor_id);

  return (
    <View style={createStyles(theme).relationshipCard}>
      <View style={createStyles(theme).relationshipHeader}>
        <View style={createStyles(theme).avatar}>
          <Text style={createStyles(theme).avatarText}>
            {(relationship.sponsor?.display_name || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={createStyles(theme).relationshipInfo}>
          <Text style={createStyles(theme).relationshipName}>
            {relationship.sponsor?.display_name ?? '?'}
          </Text>
          <Text style={createStyles(theme).relationshipMeta}>
            Connected {new Date(relationship.connected_at).toLocaleDateString()}
          </Text>
          {relationship.sponsor?.sobriety_date && (
            <View style={createStyles(theme).sobrietyInfo}>
              <Heart size={14} color={theme.primary} fill={theme.primary} />
              <Text style={createStyles(theme).sobrietyText}>{daysSober} days sober</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity style={createStyles(theme).disconnectButton} onPress={onDisconnect}>
        <UserMinus size={18} color={theme.danger} />
        <Text style={createStyles(theme).disconnectText}>Disconnect</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Render the authenticated user's profile, sobriety journey, and sponsor/sponsee management UI.
 *
 * Provides controls to edit sobriety date, log slip-ups, generate or join invite codes, and
 * disconnect relationships; handles relationship/task fetching, timezone-aware date handling,
 * and creation of related notifications.
 *
 * @returns A React element representing the profile screen
 */
export default function ProfileScreen() {
  const { profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sponsorRelationships, setSponsorRelationships] = useState<SponsorSponseeRelationship[]>(
    []
  );
  const [sponseeRelationships, setSponseeRelationships] = useState<SponsorSponseeRelationship[]>(
    []
  );
  const [loadingRelationships, setLoadingRelationships] = useState(true);
  const [showSobrietyDatePicker, setShowSobrietyDatePicker] = useState(false);
  const [selectedSobrietyDate, setSelectedSobrietyDate] = useState<Date>(new Date());
  const [showSlipUpModal, setShowSlipUpModal] = useState(false);
  const [slipUpDate, setSlipUpDate] = useState<Date>(new Date());
  const [recoveryDate, setRecoveryDate] = useState<Date>(new Date());
  const [slipUpNotes, setSlipUpNotes] = useState('');
  const [showSlipUpDatePicker, setShowSlipUpDatePicker] = useState(false);
  const [showRecoveryDatePicker, setShowRecoveryDatePicker] = useState(false);
  const [isLoggingSlipUp, setIsLoggingSlipUp] = useState(false);
  const [sponseeTaskStats, setSponseeTaskStats] = useState<{
    [key: string]: { total: number; completed: number };
  }>({});

  // User's timezone (stored in profile) with device timezone as fallback
  const userTimezone = getUserTimezone(profile);

  // Stable maximum date for DateTimePicker to prevent iOS crash when value > maximumDate.
  // iOS throws 'Start date cannot be later in time than end date!' if value > maximumDate.
  const maximumDate = useMemo(() => new Date(), []);

  const fetchRelationships = useCallback(async () => {
    if (!profile) return;

    setLoadingRelationships(true);
    try {
      const { data: asSponsee } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('*, sponsor:sponsor_id(*)')
        .eq('sponsee_id', profile.id)
        .eq('status', 'active');

      const { data: asSponsor } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('*, sponsee:sponsee_id(*)')
        .eq('sponsor_id', profile.id)
        .eq('status', 'active');

      setSponsorRelationships(asSponsee || []);
      setSponseeRelationships(asSponsor || []);

      // Batch fetch all task stats in a single query (avoids N+1 problem)
      if (asSponsor && asSponsor.length > 0) {
        const sponseeIds = asSponsor.map((rel) => rel.sponsee_id);

        const { data: allTasks } = await supabase
          .from('tasks')
          .select('sponsee_id, status')
          .eq('sponsor_id', profile.id)
          .in('sponsee_id', sponseeIds);

        // Aggregate stats client-side
        const stats: { [key: string]: { total: number; completed: number } } = {};

        // Initialize stats for all sponsees (ensures 0/0 for sponsees with no tasks)
        for (const id of sponseeIds) {
          stats[id] = { total: 0, completed: 0 };
        }

        // Count tasks per sponsee
        if (allTasks) {
          for (const task of allTasks) {
            stats[task.sponsee_id].total++;
            if (task.status === 'completed') {
              stats[task.sponsee_id].completed++;
            }
          }
        }

        setSponseeTaskStats(stats);
      }
    } catch (error) {
      logger.error('Relationships fetch failed', error as Error, {
        category: LogCategory.DATABASE,
      });
    } finally {
      setLoadingRelationships(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchRelationships();
  }, [profile, fetchRelationships]);

  // Use hook for current user's days sober
  const {
    daysSober,
    journeyStartDate,
    currentStreakStartDate,
    hasSlipUps,
    loading: loadingDaysSober,
  } = useDaysSober();

  const generateInviteCode = async () => {
    if (!profile) return;

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error } = await supabase.from('invite_codes').insert({
      code,
      sponsor_id: profile.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to generate invite code');
      } else {
        Alert.alert('Error', 'Failed to generate invite code');
      }
    } else {
      if (Platform.OS === 'web') {
        const shouldShare = window.confirm(
          `Your invite code is: ${code}\n\nShare this with your sponsee to connect.\n\nClick OK to copy to clipboard.`
        );
        if (shouldShare) {
          navigator.clipboard.writeText(code);
          window.alert('Invite code copied to clipboard!');
        }
      } else {
        Alert.alert(
          'Invite Code Generated',
          `Your invite code is: ${code}\n\nShare this with your sponsee to connect.`,
          [
            {
              text: 'Share',
              onPress: () =>
                Share.share({
                  message: `Join me on Sobriety Waypoint! Use invite code: ${code}`,
                }),
            },
            { text: 'OK' },
          ]
        );
      }
    }
  };

  const joinWithInviteCode = async () => {
    if (!inviteCode.trim() || !profile) return;

    const trimmedCode = inviteCode.trim().toUpperCase();

    if (trimmedCode.length !== 8) {
      if (Platform.OS === 'web') {
        window.alert('Invite code must be 8 characters');
      } else {
        Alert.alert('Error', 'Invite code must be 8 characters');
      }
      return;
    }

    setIsConnecting(true);

    try {
      const { data: invite, error: fetchError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', trimmedCode)
        .maybeSingle();

      if (fetchError || !invite) {
        if (Platform.OS === 'web') {
          window.alert('Invalid or expired invite code');
        } else {
          Alert.alert('Error', 'Invalid or expired invite code');
        }
        setIsConnecting(false);
        return;
      }

      // Fetch sponsor profile separately (we can't access it via join due to RLS)
      const { data: sponsorProfile, error: sponsorError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', invite.sponsor_id)
        .single();

      if (sponsorError || !sponsorProfile) {
        logger.error(
          'Sponsor profile fetch failed',
          sponsorError || new Error('Sponsor profile not found'),
          {
            category: LogCategory.DATABASE,
          }
        );
        if (Platform.OS === 'web') {
          window.alert('Unable to fetch sponsor information');
        } else {
          Alert.alert('Error', 'Unable to fetch sponsor information');
        }
        setIsConnecting(false);
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        if (Platform.OS === 'web') {
          window.alert('This invite code has expired');
        } else {
          Alert.alert('Error', 'This invite code has expired');
        }
        setIsConnecting(false);
        return;
      }

      if (invite.used_by) {
        if (Platform.OS === 'web') {
          window.alert('This invite code has already been used');
        } else {
          Alert.alert('Error', 'This invite code has already been used');
        }
        setIsConnecting(false);
        return;
      }

      if (invite.sponsor_id === profile.id) {
        if (Platform.OS === 'web') {
          window.alert('You cannot connect to yourself as a sponsor');
        } else {
          Alert.alert('Error', 'You cannot connect to yourself as a sponsor');
        }
        setIsConnecting(false);
        return;
      }

      const { data: existingRelationship } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('id')
        .eq('sponsor_id', invite.sponsor_id)
        .eq('sponsee_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingRelationship) {
        if (Platform.OS === 'web') {
          window.alert('You are already connected to this sponsor');
        } else {
          Alert.alert('Error', 'You are already connected to this sponsor');
        }
        setIsConnecting(false);
        return;
      }

      const { error: relationshipError } = await supabase
        .from('sponsor_sponsee_relationships')
        .insert({
          sponsor_id: invite.sponsor_id,
          sponsee_id: profile.id,
          status: 'active',
        });

      if (relationshipError) {
        logger.error('Sponsor-sponsee relationship creation failed', relationshipError as Error, {
          category: LogCategory.DATABASE,
        });
        const errorMessage =
          relationshipError.message || 'Failed to connect with sponsor. Please try again.';
        if (Platform.OS === 'web') {
          window.alert(`Failed to connect: ${errorMessage}`);
        } else {
          Alert.alert('Error', `Failed to connect: ${errorMessage}`);
        }
        setIsConnecting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('invite_codes')
        .update({ used_by: profile.id, used_at: new Date().toISOString() })
        .eq('id', invite.id);

      if (updateError) {
        logger.error('Invite code update failed', updateError as Error, {
          category: LogCategory.DATABASE,
        });
        // Note: This error usually indicates a missing RLS policy in Supabase.
        // Run scripts/fix_invite_codes_rls.sql to fix it.
      }

      await supabase.from('notifications').insert([
        {
          user_id: invite.sponsor_id,
          type: 'connection_request',
          title: 'New Sponsee Connected',
          content: `${profile.display_name ?? 'Unknown'} has connected with you as their sponsor.`,
          data: { sponsee_id: profile.id },
        },
        {
          user_id: profile.id,
          type: 'connection_request',
          title: 'Connected to Sponsor',
          content: `You are now connected with ${sponsorProfile.display_name ?? 'Unknown'} as your sponsor.`,
          data: { sponsor_id: invite.sponsor_id },
        },
      ]);

      await fetchRelationships();

      if (Platform.OS === 'web') {
        window.alert(`Connected with ${sponsorProfile.display_name ?? 'Unknown'}`);
      } else {
        Alert.alert('Success', `Connected with ${sponsorProfile.display_name ?? 'Unknown'}`);
      }

      setShowInviteInput(false);
      setInviteCode('');
    } catch (error: unknown) {
      logger.error('Join with invite code failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      const message =
        error instanceof Error ? error.message : 'Network error. Please check your connection.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectRelationship = async (
    relationshipId: string,
    isSponsor: boolean,
    otherUserName: string
  ) => {
    const confirmMessage = isSponsor
      ? `Are you sure you want to disconnect from ${otherUserName}? This will end your sponsee relationship.`
      : `Are you sure you want to disconnect from ${otherUserName}? This will end your sponsor relationship.`;

    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(confirmMessage)
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Confirm Disconnection', confirmMessage, [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Disconnect',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]);
          });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('sponsor_sponsee_relationships')
        .update({
          status: 'inactive',
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', relationshipId);

      if (error) throw error;

      const relationship = isSponsor
        ? sponseeRelationships.find((r) => r.id === relationshipId)
        : sponsorRelationships.find((r) => r.id === relationshipId);

      if (relationship) {
        const notificationRecipientId = isSponsor
          ? relationship.sponsee_id
          : relationship.sponsor_id;
        const notificationSenderName = profile?.display_name ?? 'Unknown';

        await supabase.from('notifications').insert([
          {
            user_id: notificationRecipientId,
            type: 'connection_request',
            title: 'Relationship Ended',
            content: `${notificationSenderName} has ended the ${isSponsor ? 'sponsorship' : 'sponsee'} relationship.`,
            data: { relationship_id: relationshipId },
          },
        ]);
      }

      await fetchRelationships();

      if (Platform.OS === 'web') {
        window.alert('Successfully disconnected');
      } else {
        Alert.alert('Success', 'Successfully disconnected');
      }
    } catch (error: unknown) {
      logger.error('Disconnect relationship failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      const message = error instanceof Error ? error.message : 'Failed to disconnect.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const handleEditSobrietyDate = () => {
    if (profile?.sobriety_date) {
      // Parse using the user's stored timezone to maintain consistency
      // with how dates are saved (line 939 uses userTimezone)
      const parsedDate = parseDateAsLocal(profile.sobriety_date, userTimezone);
      // Clamp to maximumDate to prevent iOS DateTimePicker crash
      setSelectedSobrietyDate(parsedDate > maximumDate ? maximumDate : parsedDate);
    }
    setShowSobrietyDatePicker(true);
  };

  const updateSobrietyDate = async (newDate: Date) => {
    if (!profile) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      if (Platform.OS === 'web') {
        window.alert('Sobriety date cannot be in the future');
      } else {
        Alert.alert('Invalid Date', 'Sobriety date cannot be in the future');
      }
      return;
    }

    const confirmMessage = `Update your sobriety date to ${newDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}?`;

    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(confirmMessage)
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Confirm Date Change', confirmMessage, [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              { text: 'Update', onPress: () => resolve(true) },
            ]);
          });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          sobriety_date: formatDateWithTimezone(newDate, userTimezone),
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();

      if (Platform.OS === 'web') {
        window.alert('Sobriety date updated successfully');
      } else {
        Alert.alert('Success', 'Sobriety date updated successfully');
      }
    } catch (error: unknown) {
      logger.error('Sobriety date update failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      const message = error instanceof Error ? error.message : 'Failed to update sobriety date.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const handleLogSlipUp = () => {
    const today = new Date();
    setSlipUpDate(today);
    setRecoveryDate(today);
    setSlipUpNotes('');
    setShowSlipUpModal(true);
  };

  /**
   * Submits a slip-up record with timezone-aware date formatting.
   * Uses the user's stored timezone if available, otherwise falls back to device timezone.
   */
  const submitSlipUp = async () => {
    if (!profile) return;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (slipUpDate > today) {
      if (Platform.OS === 'web') {
        window.alert('Slip-up date cannot be in the future');
      } else {
        Alert.alert('Invalid Date', 'Slip-up date cannot be in the future');
      }
      return;
    }

    if (recoveryDate < slipUpDate) {
      if (Platform.OS === 'web') {
        window.alert('Recovery restart date must be on or after the slip-up date');
      } else {
        Alert.alert('Invalid Date', 'Recovery restart date must be on or after the slip-up date');
      }
      return;
    }

    const confirmMessage =
      'This will log your slip-up and restart your current streak. Your sponsor will be notified. Continue?';

    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(confirmMessage)
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Confirm Slip-Up Log', confirmMessage, [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Continue',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]);
          });

    if (!confirmed) return;

    setIsLoggingSlipUp(true);

    try {
      const { error: slipUpError } = await supabase.from('slip_ups').insert({
        user_id: profile.id,
        slip_up_date: formatDateWithTimezone(slipUpDate, userTimezone),
        recovery_restart_date: formatDateWithTimezone(recoveryDate, userTimezone),
        notes: slipUpNotes.trim() || null,
      });

      if (slipUpError) throw slipUpError;

      // IMPORTANT BEHAVIORAL CHANGE:
      // We intentionally do NOT update profile.sobriety_date here.
      // Previously, sobriety_date was updated on slip-ups to track 'current streak start'.
      // Now, sobriety_date represents when the user's recovery journey began (immutable).
      // The slip_ups table stores recovery_restart_date which useDaysSober uses to
      // calculate the current streak. See Profile.sobriety_date in types/database.ts.

      const { data: sponsors } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('sponsor_id')
        .eq('sponsee_id', profile.id)
        .eq('status', 'active');

      if (sponsors && sponsors.length > 0) {
        const notifications = sponsors.map((rel) => ({
          user_id: rel.sponsor_id,
          type: 'milestone',
          title: 'Sponsee Slip Up',
          content: `${profile.display_name ?? 'Unknown'} has logged a slip-up and restarted their recovery journey.`,
          data: {
            sponsee_id: profile.id,
            slip_up_date: slipUpDate.toISOString(),
          },
        }));

        await supabase.from('notifications').insert(notifications);
      }

      await refreshProfile();
      setShowSlipUpModal(false);

      if (Platform.OS === 'web') {
        window.alert(
          'Your slip-up has been logged. Remember, recovery is a journey. You are brave for being honest. Keep moving forward, one day at a time.'
        );
      } else {
        Alert.alert(
          'Slip-Up Logged',
          'Your slip-up has been logged. Remember, recovery is a journey. You are brave for being honest. Keep moving forward, one day at a time.'
        );
      }
    } catch (error: unknown) {
      logger.error('Slip-up logging failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      const message = error instanceof Error ? error.message : 'Failed to log slip-up.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setIsLoggingSlipUp(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Settings size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.display_name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.display_name ?? '?'}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        <View style={styles.sobrietyCard}>
          <View style={styles.sobrietyHeader}>
            <Heart size={24} color={theme.primary} fill={theme.primary} />
            <Text style={styles.sobrietyTitle}>Sobriety Journey</Text>
          </View>
          <Text style={styles.daysSober}>{loadingDaysSober ? '...' : `${daysSober} Days`}</Text>
          <View style={styles.sobrietyDateContainer}>
            {journeyStartDate && (
              <Text style={styles.journeyStartDate}>
                Journey started:{' '}
                {parseDateAsLocal(journeyStartDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            )}
            <TouchableOpacity style={styles.editButton} onPress={handleEditSobrietyDate}>
              <Edit2 size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
          {hasSlipUps && currentStreakStartDate && (
            <Text style={styles.currentStreakDate}>
              Current streak since{' '}
              {parseDateAsLocal(currentStreakStartDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          )}
          <TouchableOpacity style={styles.slipUpButton} onPress={handleLogSlipUp}>
            <AlertCircle size={18} color={theme.white} />
            <Text style={styles.slipUpButtonText}>Log a Slip Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Sponsees</Text>
          {loadingRelationships ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : sponseeRelationships.length > 0 ? (
            <>
              {sponseeRelationships.map((rel) => (
                <SponseeDaysDisplay
                  key={rel.id}
                  relationship={rel}
                  theme={theme}
                  taskStats={sponseeTaskStats[rel.sponsee_id]}
                  onDisconnect={() =>
                    disconnectRelationship(rel.id, true, rel.sponsee?.display_name || 'Unknown')
                  }
                />
              ))}
              <TouchableOpacity style={styles.actionButton} onPress={generateInviteCode}>
                <Share2 size={20} color={theme.primary} />
                <Text style={styles.actionButtonText}>Generate New Invite Code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View>
              <Text style={styles.emptyStateText}>
                No sponsees yet. Generate an invite code to get started.
              </Text>
              <TouchableOpacity style={styles.actionButton} onPress={generateInviteCode}>
                <Share2 size={20} color={theme.primary} />
                <Text style={styles.actionButtonText}>Generate Invite Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Sponsor</Text>
          {loadingRelationships ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : sponsorRelationships.length > 0 ? (
            sponsorRelationships.map((rel) => (
              <SponsorDaysDisplay
                key={rel.id}
                relationship={rel}
                theme={theme}
                onDisconnect={() =>
                  disconnectRelationship(rel.id, false, rel.sponsor?.display_name || 'Unknown')
                }
              />
            ))
          ) : (
            <View>
              <Text style={styles.emptyStateText}>No sponsor connected yet</Text>
              {!showInviteInput ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowInviteInput(true)}
                >
                  <QrCode size={20} color={theme.primary} />
                  <Text style={styles.actionButtonText}>Enter Invite Code</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.inviteInputContainer}>
                  <TextInput
                    style={styles.inviteInput}
                    placeholder="Enter 8-character code"
                    placeholderTextColor={theme.textTertiary}
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="characters"
                    maxLength={8}
                    editable={!isConnecting}
                    returnKeyType="done"
                    onSubmitEditing={joinWithInviteCode}
                  />
                  <TouchableOpacity
                    style={[styles.inviteSubmitButton, isConnecting && styles.buttonDisabled]}
                    onPress={joinWithInviteCode}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <ActivityIndicator size="small" color={theme.white} />
                    ) : (
                      <Text style={styles.inviteSubmitText}>Connect</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.inviteCancelButton}
                    onPress={() => {
                      setShowInviteInput(false);
                      setInviteCode('');
                    }}
                    disabled={isConnecting}
                  >
                    <Text style={styles.inviteCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {sponsorRelationships.length > 0 && !showInviteInput && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowInviteInput(true)}>
              <QrCode size={20} color={theme.primary} />
              <Text style={styles.actionButtonText}>Connect to Another Sponsor</Text>
            </TouchableOpacity>
          </View>
        )}

        {Platform.OS === 'web' && showSobrietyDatePicker && (
          <Modal visible={showSobrietyDatePicker} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <Text style={styles.modalTitle}>Edit Sobriety Date</Text>
                <input
                  type="date"
                  value={formatDateWithTimezone(selectedSobrietyDate, userTimezone)}
                  max={formatDateWithTimezone(new Date(), userTimezone)}
                  onChange={(e) =>
                    setSelectedSobrietyDate(parseDateAsLocal(e.target.value, userTimezone))
                  }
                  style={{
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    marginTop: 16,
                    marginBottom: 16,
                    width: '100%',
                  }}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowSobrietyDatePicker(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => {
                      updateSobrietyDate(selectedSobrietyDate);
                      setShowSobrietyDatePicker(false);
                    }}
                  >
                    <Text style={styles.modalConfirmText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS !== 'web' && showSobrietyDatePicker && (
          <Modal visible={showSobrietyDatePicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <Text style={styles.modalTitle}>Edit Sobriety Date</Text>
                <DateTimePicker
                  value={selectedSobrietyDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) setSelectedSobrietyDate(date);
                  }}
                  maximumDate={maximumDate}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowSobrietyDatePicker(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => {
                      updateSobrietyDate(selectedSobrietyDate);
                      setShowSobrietyDatePicker(false);
                    }}
                  >
                    <Text style={styles.modalConfirmText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        <Modal visible={showSlipUpModal} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.slipUpModalOverlay}
            keyboardVerticalOffset={0}
          >
            <TouchableOpacity
              style={styles.slipUpModalBackdrop}
              activeOpacity={1}
              onPress={() => setShowSlipUpModal(false)}
            />
            <View style={styles.slipUpModal}>
              <ScrollView
                contentContainerStyle={styles.slipUpModalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                bounces={false}
              >
                <Text style={styles.modalTitle}>Log a Slip Up</Text>
                <Text style={styles.modalSubtitle}>
                  Recovery is a journey, not a destination. Logging a slip up is an act of courage
                  and honesty.
                </Text>

                <View style={styles.dateSection}>
                  <Text style={styles.dateLabel}>Slip Up Date</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={formatDateWithTimezone(slipUpDate, userTimezone)}
                      max={formatDateWithTimezone(new Date(), userTimezone)}
                      onChange={(e) =>
                        setSlipUpDate(parseDateAsLocal(e.target.value, userTimezone))
                      }
                      style={{
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 8,
                        border: `1px solid ${theme.border}`,
                        width: '100%',
                      }}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowSlipUpDatePicker(true)}
                      >
                        <Calendar size={20} color={theme.textSecondary} />
                        <Text style={styles.dateButtonText}>
                          {slipUpDate.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </TouchableOpacity>
                      {showSlipUpDatePicker && (
                        <DateTimePicker
                          value={slipUpDate}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            setShowSlipUpDatePicker(false);
                            if (date) setSlipUpDate(date);
                          }}
                          maximumDate={new Date()}
                        />
                      )}
                    </>
                  )}
                </View>

                <View style={styles.dateSection}>
                  <Text style={styles.dateLabel}>Recovery Restart Date</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={formatDateWithTimezone(recoveryDate, userTimezone)}
                      min={formatDateWithTimezone(slipUpDate, userTimezone)}
                      onChange={(e) =>
                        setRecoveryDate(parseDateAsLocal(e.target.value, userTimezone))
                      }
                      style={{
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 8,
                        border: `1px solid ${theme.border}`,
                        width: '100%',
                      }}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowRecoveryDatePicker(true)}
                      >
                        <Calendar size={20} color={theme.textSecondary} />
                        <Text style={styles.dateButtonText}>
                          {recoveryDate.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </TouchableOpacity>
                      {showRecoveryDatePicker && (
                        <DateTimePicker
                          value={recoveryDate}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            setShowRecoveryDatePicker(false);
                            if (date) setRecoveryDate(date);
                          }}
                          minimumDate={slipUpDate}
                        />
                      )}
                    </>
                  )}
                </View>

                <View style={styles.notesSection}>
                  <Text style={styles.dateLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="What happened? How are you feeling?"
                    placeholderTextColor={theme.textTertiary}
                    value={slipUpNotes}
                    onChangeText={setSlipUpNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <Text style={styles.privacyNote}>
                  This information will be visible to you and your sponsor.
                </Text>
              </ScrollView>

              <View style={styles.slipUpModalButtonsContainer}>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowSlipUpModal(false)}
                    disabled={isLoggingSlipUp}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalConfirmButton,
                      styles.slipUpConfirmButton,
                      isLoggingSlipUp && styles.buttonDisabled,
                    ]}
                    onPress={submitSlipUp}
                    disabled={isLoggingSlipUp}
                  >
                    {isLoggingSlipUp ? (
                      <ActivityIndicator size="small" color={theme.white} />
                    ) : (
                      <Text style={styles.modalConfirmText}>Log Slip Up</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    keyboardAvoidingContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      alignItems: 'center',
      padding: 24,
      paddingTop: 60,
      backgroundColor: theme.surface,
    },
    headerTop: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 16,
    },
    settingsButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.card,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarText: {
      fontSize: 32,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.white,
    },
    name: {
      fontSize: 24,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    sobrietyCard: {
      backgroundColor: theme.card,
      margin: 16,
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    sobrietyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sobrietyTitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
    daysSober: {
      fontSize: 48,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.primary,
    },
    sobrietyDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      gap: 8,
    },
    sobrietyDate: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    journeyStartDate: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    currentStreakDate: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.text,
      fontWeight: '500',
      marginTop: 8,
    },
    editButton: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: theme.primaryLight,
    },
    slipUpButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.danger,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 20,
      gap: 8,
    },
    slipUpButtonText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    actionButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
    inviteInputContainer: {
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    inviteInput: {
      backgroundColor: theme.borderLight,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      marginBottom: 12,
      color: theme.text,
    },
    inviteSubmitButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      marginBottom: 8,
    },
    inviteSubmitText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    inviteCancelButton: {
      padding: 12,
      alignItems: 'center',
    },
    inviteCancelText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    relationshipCard: {
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    relationshipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    relationshipInfo: {
      marginLeft: 12,
      flex: 1,
    },
    relationshipName: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    relationshipMeta: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 2,
    },
    sobrietyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    sobrietyText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.primary,
      fontWeight: '600',
    },
    taskStatsInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    taskStatsText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.success,
      fontWeight: '600',
    },
    disconnectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
      backgroundColor: theme.dangerLight,
    },
    disconnectText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.danger,
      marginLeft: 12,
    },
    emptyStateText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    datePickerModal: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    slipUpModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    slipUpModalBackdrop: {
      flex: 1,
    },
    slipUpModal: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
    },
    slipUpModalScrollContent: {
      padding: 24,
      paddingBottom: 16,
    },
    slipUpModalButtonsContainer: {
      padding: 24,
      paddingTop: 16,
      backgroundColor: theme.surface,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    dateSection: {
      marginBottom: 20,
    },
    dateLabel: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dateButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
      marginLeft: 12,
    },
    notesSection: {
      marginBottom: 20,
    },
    notesInput: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
      minHeight: 100,
    },
    privacyNote: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      textAlign: 'center',
      marginBottom: 24,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    modalConfirmButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    slipUpConfirmButton: {
      backgroundColor: theme.danger,
    },
    modalConfirmText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
  });
