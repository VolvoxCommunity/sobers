import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  CheckCircle,
  Settings,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { SponsorSponseeRelationship } from '@/types/database';
import { logger, LogCategory } from '@/lib/logger';
import { formatDateWithTimezone, parseDateAsLocal, getUserTimezone } from '@/lib/date';
import SettingsSheet, { SettingsSheetRef } from '@/components/SettingsSheet';
import LogSlipUpSheet, { LogSlipUpSheetRef } from '@/components/sheets/LogSlipUpSheet';
import EnterInviteCodeSheet, {
  EnterInviteCodeSheetRef,
} from '@/components/sheets/EnterInviteCodeSheet';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

// =============================================================================
// Helper Components
// =============================================================================

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
    <View
      style={createStyles(theme).relationshipCard}
      accessible={true}
      accessibilityLabel={`Sponsee ${relationship.sponsee?.display_name ?? 'unknown'}`}
    >
      <View style={createStyles(theme).relationshipHeader}>
        <View style={createStyles(theme).avatar} accessibilityRole="image">
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
            <View
              style={createStyles(theme).sobrietyInfo}
              accessibilityLabel={`${daysSober} days sober`}
            >
              <Heart size={14} color={theme.primary} fill={theme.primary} />
              <Text style={createStyles(theme).sobrietyText}>{daysSober} days sober</Text>
            </View>
          )}
          {taskStats && (
            <View
              style={createStyles(theme).taskStatsInfo}
              accessibilityLabel={`${taskStats.completed} out of ${taskStats.total} tasks completed`}
            >
              <CheckCircle size={14} color={theme.success} />
              <Text style={createStyles(theme).taskStatsText}>
                {taskStats.completed}/{taskStats.total} tasks completed
              </Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={createStyles(theme).disconnectButton}
        onPress={onDisconnect}
        accessibilityRole="button"
        accessibilityLabel={`Disconnect from ${relationship.sponsee?.display_name ?? 'sponsee'}`}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
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
    <View
      style={createStyles(theme).relationshipCard}
      accessible={true}
      accessibilityLabel={`Sponsor ${relationship.sponsor?.display_name ?? 'unknown'}`}
    >
      <View style={createStyles(theme).relationshipHeader}>
        <View style={createStyles(theme).avatar} accessibilityRole="image">
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
            <View
              style={createStyles(theme).sobrietyInfo}
              accessibilityLabel={`${daysSober} days sober`}
            >
              <Heart size={14} color={theme.primary} fill={theme.primary} />
              <Text style={createStyles(theme).sobrietyText}>{daysSober} days sober</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={createStyles(theme).disconnectButton}
        onPress={onDisconnect}
        accessibilityRole="button"
        accessibilityLabel={`Disconnect from ${relationship.sponsor?.display_name ?? 'sponsor'}`}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
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
  const { user, profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // Account for native tab bar height and safe area
  const scrollPadding = useTabBarPadding();
  const settingsSheetRef = useRef<SettingsSheetRef>(null);
  const logSlipUpSheetRef = useRef<LogSlipUpSheetRef>(null);
  const inviteCodeSheetRef = useRef<EnterInviteCodeSheetRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [sponsorRelationships, setSponsorRelationships] = useState<SponsorSponseeRelationship[]>(
    []
  );
  const [sponseeRelationships, setSponseeRelationships] = useState<SponsorSponseeRelationship[]>(
    []
  );
  const [loadingRelationships, setLoadingRelationships] = useState(true);
  const [showSobrietyDatePicker, setShowSobrietyDatePicker] = useState(false);
  const [selectedSobrietyDate, setSelectedSobrietyDate] = useState<Date>(new Date());
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

  /**
   * Handles connecting to a sponsor using an invite code.
   * Called from the EnterInviteCodeSheet component.
   *
   * @param inviteCode - The 8-character invite code from the sponsor
   * @throws Error if connection fails (handled by the sheet)
   */
  const joinWithInviteCode = async (inviteCode: string) => {
    if (!profile || !user) {
      throw new Error('Please sign in to connect with a sponsor');
    }

    const trimmedCode = inviteCode.trim().toUpperCase();

    try {
      const { data: invite, error: fetchError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', trimmedCode)
        .maybeSingle();

      if (fetchError || !invite) {
        throw new Error('Invalid or expired invite code');
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
        throw new Error('Unable to fetch sponsor information');
      }

      if (new Date(invite.expires_at) < new Date()) {
        throw new Error('This invite code has expired');
      }

      if (invite.used_by) {
        throw new Error('This invite code has already been used');
      }

      if (invite.sponsor_id === user.id || invite.sponsor_id === profile.id) {
        throw new Error('You cannot connect to yourself as a sponsor');
      }

      const { data: existingRelationship } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('id')
        .eq('sponsor_id', invite.sponsor_id)
        .eq('sponsee_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingRelationship) {
        throw new Error('You are already connected to this sponsor');
      }

      // Use user.id for sponsee_id to satisfy RLS policy: sponsee_id = auth.uid()
      const { error: relationshipError } = await supabase
        .from('sponsor_sponsee_relationships')
        .insert({
          sponsor_id: invite.sponsor_id,
          sponsee_id: user.id,
          status: 'active',
        });

      if (relationshipError) {
        logger.error('Sponsor-sponsee relationship creation failed', relationshipError as Error, {
          category: LogCategory.DATABASE,
        });
        throw new Error(
          relationshipError.message || 'Failed to connect with sponsor. Please try again.'
        );
      }

      // Use user.id (auth.uid()) instead of profile.id to satisfy RLS policy
      // The WITH CHECK clause requires: used_by = auth.uid()
      const { error: updateError } = await supabase
        .from('invite_codes')
        .update({ used_by: user.id, used_at: new Date().toISOString() })
        .eq('id', invite.id);

      if (updateError) {
        logger.error('Invite code update failed', updateError as Error, {
          category: LogCategory.DATABASE,
        });
      }

      await supabase.from('notifications').insert([
        {
          user_id: invite.sponsor_id,
          type: 'connection_request',
          title: 'New Sponsee Connected',
          content: `${profile.display_name ?? 'Unknown'} has connected with you as their sponsor.`,
          data: { sponsee_id: user.id },
        },
        {
          user_id: user.id,
          type: 'connection_request',
          title: 'Connected to Sponsor',
          content: `You are now connected with ${sponsorProfile.display_name ?? 'Unknown'} as your sponsor.`,
          data: { sponsor_id: invite.sponsor_id },
        },
      ]);

      await fetchRelationships();

      // Show success message
      if (Platform.OS === 'web') {
        window.alert(`Connected with ${sponsorProfile.display_name ?? 'Unknown'}`);
      } else {
        Alert.alert('Success', `Connected with ${sponsorProfile.display_name ?? 'Unknown'}`);
      }
    } catch (error: unknown) {
      logger.error('Join with invite code failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      // Re-throw the error so the sheet can display it
      throw error instanceof Error
        ? error
        : new Error('Network error. Please check your connection.');
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

  const updateSobrietyDate = useCallback(
    async (newDate: Date) => {
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
    },
    [profile, userTimezone, refreshProfile]
  );

  /**
   * Shared handler for confirming a sobriety date selection.
   * Closes the date picker and triggers the update.
   * Used by both iOS (Update button) and Android (native OK) date pickers.
   *
   * @param date - The selected date to update, or undefined to cancel
   */
  const handleSobrietyDateConfirm = useCallback(
    (date: Date | undefined) => {
      setShowSobrietyDatePicker(false);
      if (date) {
        updateSobrietyDate(date);
      }
    },
    [updateSobrietyDate]
  );

  const handleLogSlipUp = () => {
    logSlipUpSheetRef.current?.present();
  };

  const handleSlipUpLogged = async () => {
    await refreshProfile();
  };

  /**
   * Opens the invite code entry sheet.
   */
  const handleShowInviteCodeSheet = () => {
    inviteCodeSheetRef.current?.present();
  };

  const styles = createStyles(theme, insets);

  return (
    <KeyboardAwareScrollView
      ref={scrollViewRef}
      style={[styles.keyboardAvoidingContainer, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingBottom: scrollPadding,
        flexGrow: 1,
        backgroundColor: theme.background,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
    >
      {/* Navigation Header Bar */}
      <View style={styles.navigationHeader}>
        <Text style={styles.navigationTitle} nativeID="profile-title">
          Profile
        </Text>
        <TouchableOpacity
          onPress={() => settingsSheetRef.current?.present()}
          style={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          accessibilityLabelledBy="profile-title"
          testID="settings-button"
        >
          <Settings size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <View style={styles.profileHeader} accessible={true}>
          <View style={styles.avatar} accessibilityRole="image">
            <Text style={styles.avatarText}>
              {profile?.display_name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.name} accessibilityRole="header">
            {profile?.display_name ?? '?'}
          </Text>
          <Text style={styles.email} accessibilityRole="text">
            {profile?.email}
          </Text>
        </View>

        <View style={styles.sobrietyCard} accessible={false}>
          <View
            style={styles.sobrietyHeader}
            accessibilityRole="header"
            accessibilityLabel="Sobriety Journey"
          >
            <Heart size={24} color={theme.primary} fill={theme.primary} />
            <Text style={styles.sobrietyTitle}>Sobriety Journey</Text>
          </View>
          <Text
            style={styles.daysSober}
            accessibilityRole="text"
            accessibilityLabel={loadingDaysSober ? 'Loading days sober' : `${daysSober} Days Sober`}
            accessibilityLiveRegion="polite"
          >
            {loadingDaysSober ? '...' : `${daysSober} Days`}
          </Text>
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
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditSobrietyDate}
              accessibilityRole="button"
              accessibilityLabel="Edit sobriety date"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Edit2 size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
          {hasSlipUps && currentStreakStartDate && (
            <Text
              style={styles.currentStreakDate}
              accessibilityRole="text"
              accessibilityLabel={`Current streak since ${parseDateAsLocal(currentStreakStartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            >
              Current streak since{' '}
              {parseDateAsLocal(currentStreakStartDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          )}
          <TouchableOpacity
            style={styles.slipUpButton}
            onPress={handleLogSlipUp}
            accessibilityRole="button"
            accessibilityLabel="Record a Setback"
            accessibilityHint="Logs a slip up and resets your streak"
          >
            <Heart size={18} color={theme.white} />
            <Text style={styles.slipUpButtonText}>Record a Setback</Text>
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
              <TouchableOpacity
                style={styles.actionButton}
                onPress={generateInviteCode}
                accessibilityRole="button"
                accessibilityLabel="Generate New Invite Code"
              >
                <Share2 size={20} color={theme.primary} />
                <Text style={styles.actionButtonText}>Generate New Invite Code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View>
              <Text style={styles.emptyStateText}>
                No sponsees yet. Generate an invite code to get started.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={generateInviteCode}
                accessibilityRole="button"
                accessibilityLabel="Generate Invite Code"
              >
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
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShowInviteCodeSheet}
                accessibilityRole="button"
                accessibilityLabel="Enter Invite Code"
              >
                <QrCode size={20} color={theme.primary} />
                <Text style={styles.actionButtonText}>Enter Invite Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {sponsorRelationships.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShowInviteCodeSheet}
              accessibilityRole="button"
              accessibilityLabel="Connect to Another Sponsor"
            >
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

        {/* iOS: Custom modal with spinner picker requires explicit "Update" button
            because the spinner UI allows continuous scrolling without clear confirmation.
            This matches iOS platform conventions for date selection. */}
        {Platform.OS === 'ios' && showSobrietyDatePicker && (
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
                    onPress={() => handleSobrietyDateConfirm(undefined)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => handleSobrietyDateConfirm(selectedSobrietyDate)}
                  >
                    <Text style={styles.modalConfirmText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Android: Native dialog has built-in OK/Cancel buttons. Pressing OK confirms
            the selection immediately, which matches Android platform conventions.
            The dialog auto-closes on any action, so we sync state accordingly. */}
        {Platform.OS === 'android' && showSobrietyDatePicker && (
          <DateTimePicker
            value={selectedSobrietyDate}
            mode="date"
            display="default"
            onChange={(event, date) => handleSobrietyDateConfirm(date)}
            maximumDate={maximumDate}
          />
        )}

        {/* Settings Sheet */}
        <SettingsSheet ref={settingsSheetRef} />

        {/* Log Slip Up Sheet */}
        {profile && (
          <LogSlipUpSheet
            ref={logSlipUpSheetRef}
            profile={profile}
            theme={theme}
            onClose={() => {
              // Sheet dismissed without logging
            }}
            onSlipUpLogged={handleSlipUpLogged}
          />
        )}

        {/* Enter Invite Code Sheet */}
        {profile && user && (
          <EnterInviteCodeSheet
            ref={inviteCodeSheetRef}
            theme={theme}
            onSubmit={joinWithInviteCode}
          />
        )}
      </View>
    </KeyboardAwareScrollView>
  );
}

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  insets: { top: number } = { top: 0 }
) =>
  StyleSheet.create({
    keyboardAvoidingContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    navigationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: insets.top + 8,
      paddingHorizontal: 20,
      paddingBottom: 12,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    navigationTitle: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    settingsButton: {
      padding: 8,
    },
    profileHeader: {
      alignItems: 'center',
      padding: 24,
      paddingTop: 20,
      backgroundColor: theme.surface,
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
      backgroundColor: theme.primary,
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
    modalTitle: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
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
    modalConfirmText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
  });
