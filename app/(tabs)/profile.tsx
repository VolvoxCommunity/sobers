import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { Settings } from 'lucide-react-native';
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
import { showAlert, showConfirm } from '@/lib/alert';
import ProfileHeader from '@/components/profile/ProfileHeader';
import SobrietyStats from '@/components/profile/SobrietyStats';
import RelationshipCard from '@/components/profile/RelationshipCard';
import InviteCodeSection from '@/components/profile/InviteCodeSection';

/**
 * Render the authenticated user's profile, sobriety stats, and sponsor/sponsee management interface,
 * including controls to edit sobriety date, log slip-ups, manage invite codes, and disconnect relationships.
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
      const { data: asSponsee, error: asSponseeError } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('*, sponsor:sponsor_id(*)')
        .eq('sponsee_id', profile.id)
        .eq('status', 'active');

      if (asSponseeError) {
        logger.error(
          'Failed to fetch sponsee relationships',
          new Error(asSponseeError.message || 'Unknown database error'),
          {
            category: LogCategory.DATABASE,
          }
        );
        return;
      }

      const { data: asSponsor, error: asSponsorError } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('*, sponsee:sponsee_id(*)')
        .eq('sponsor_id', profile.id)
        .eq('status', 'active');

      if (asSponsorError) {
        logger.error(
          'Failed to fetch sponsor relationships',
          new Error(asSponsorError.message || 'Unknown database error'),
          {
            category: LogCategory.DATABASE,
          }
        );
        return;
      }

      setSponsorRelationships(asSponsee || []);
      setSponseeRelationships(asSponsor || []);

      // Batch fetch all task stats in a single query (avoids N+1 problem)
      if (asSponsor && asSponsor.length > 0) {
        const sponseeIds = asSponsor.map((rel) => rel.sponsee_id);

        const { data: allTasks, error: allTasksError } = await supabase
          .from('tasks')
          .select('sponsee_id, status')
          .eq('sponsor_id', profile.id)
          .in('sponsee_id', sponseeIds);

        if (allTasksError) {
          logger.error(
            'Failed to fetch task statistics',
            new Error(allTasksError.message || 'Unknown database error'),
            {
              category: LogCategory.DATABASE,
            }
          );
          return;
        }

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
      showAlert('Error', 'Failed to generate invite code');
    } else {
      if (Platform.OS === 'web') {
        const shouldCopy = window.confirm(
          `Your invite code is: ${code}\n\nShare this with your sponsee to connect.\n\nClick OK to copy to clipboard.`
        );
        if (shouldCopy) {
          navigator.clipboard.writeText(code);
          showAlert('Success', 'Invite code copied to clipboard!');
        }
      } else {
        showAlert(
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

      const { data: existingRelationship, error: existingRelationshipError } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('id')
        .eq('sponsor_id', invite.sponsor_id)
        .eq('sponsee_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingRelationshipError) {
        logger.error(
          'Failed to check existing relationship',
          new Error(existingRelationshipError.message || 'Unknown database error'),
          {
            category: LogCategory.DATABASE,
          }
        );
        throw new Error('Failed to verify existing connections');
      }

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
      showAlert('Success', `Connected with ${sponsorProfile.display_name ?? 'Unknown'}`);
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

    const confirmed = await showConfirm(
      'Confirm Disconnection',
      confirmMessage,
      'Disconnect',
      'Cancel',
      true
    );

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

      showAlert('Success', 'Successfully disconnected');
    } catch (error: unknown) {
      logger.error('Disconnect relationship failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      const message = error instanceof Error ? error.message : 'Failed to disconnect.';
      showAlert('Error', message);
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
        showAlert('Invalid Date', 'Sobriety date cannot be in the future');
        return;
      }

      const confirmMessage = `Update your sobriety date to ${newDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}?`;

      const confirmed = await showConfirm(
        'Confirm Date Change',
        confirmMessage,
        'Update',
        'Cancel'
      );

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

        showAlert('Success', 'Sobriety date updated successfully');
      } catch (error: unknown) {
        logger.error('Sobriety date update failed', error as Error, {
          category: LogCategory.DATABASE,
        });
        const message = error instanceof Error ? error.message : 'Failed to update sobriety date.';
        showAlert('Error', message);
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

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

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
        <ProfileHeader displayName={profile?.display_name} email={profile?.email} theme={theme} />

        <SobrietyStats
          daysSober={daysSober}
          journeyStartDate={journeyStartDate}
          currentStreakStartDate={currentStreakStartDate}
          hasSlipUps={hasSlipUps}
          loading={loadingDaysSober}
          theme={theme}
          onEditSobrietyDate={handleEditSobrietyDate}
          onLogSlipUp={handleLogSlipUp}
        />

        {loadingRelationships ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Sponsees</Text>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          </View>
        ) : (
          <InviteCodeSection
            title="Your Sponsees"
            isEmpty={sponseeRelationships.length === 0}
            emptyMessage="No sponsees yet. Generate an invite code to get started."
            primaryButtonLabel={
              sponseeRelationships.length > 0 ? 'Generate New Invite Code' : 'Generate Invite Code'
            }
            showGenerateNew={sponseeRelationships.length > 0}
            theme={theme}
            onPrimaryAction={generateInviteCode}
          >
            {sponseeRelationships.map((rel) => (
              <RelationshipCard
                key={rel.id}
                userId={rel.sponsee_id}
                profile={rel.sponsee ?? null}
                connectedAt={rel.connected_at}
                relationshipType="sponsee"
                theme={theme}
                taskStats={sponseeTaskStats[rel.sponsee_id]}
                onDisconnect={() =>
                  disconnectRelationship(rel.id, true, rel.sponsee?.display_name || 'Unknown')
                }
              />
            ))}
          </InviteCodeSection>
        )}

        {loadingRelationships ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Sponsor</Text>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          </View>
        ) : (
          <InviteCodeSection
            title="Your Sponsor"
            isEmpty={sponsorRelationships.length === 0}
            emptyMessage="No sponsor connected yet"
            primaryButtonLabel="Enter Invite Code"
            theme={theme}
            onPrimaryAction={handleShowInviteCodeSheet}
            onSecondaryAction={
              sponsorRelationships.length > 0 ? handleShowInviteCodeSheet : undefined
            }
          >
            {sponsorRelationships.map((rel) => (
              <RelationshipCard
                key={rel.id}
                userId={rel.sponsor_id}
                profile={rel.sponsor ?? null}
                connectedAt={rel.connected_at}
                relationshipType="sponsor"
                theme={theme}
                onDisconnect={() =>
                  disconnectRelationship(rel.id, false, rel.sponsor?.display_name || 'Unknown')
                }
              />
            ))}
          </InviteCodeSection>
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
                    accessibilityRole="button"
                    accessibilityLabel="Cancel date selection"
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => {
                      updateSobrietyDate(selectedSobrietyDate);
                      setShowSobrietyDatePicker(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Update sobriety date"
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
                    accessibilityRole="button"
                    accessibilityLabel="Cancel date selection"
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => handleSobrietyDateConfirm(selectedSobrietyDate)}
                    accessibilityRole="button"
                    accessibilityLabel="Update sobriety date"
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
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
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