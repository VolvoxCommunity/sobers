import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useDaysSober } from '@/hooks/useDaysSober';
import { Settings } from 'lucide-react-native';
import type {
  SponsorSponseeRelationship,
  InviteCode,
  ConnectionIntent,
  ConnectionMatch,
} from '@/types/database';
import { logger, LogCategory } from '@/lib/logger';
import LogSlipUpSheet, { LogSlipUpSheetRef } from '@/components/sheets/LogSlipUpSheet';
import EnterInviteCodeSheet, {
  EnterInviteCodeSheetRef,
} from '@/components/sheets/EnterInviteCodeSheet';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { showConfirm } from '@/lib/alert';
import { showToast } from '@/lib/toast';
import ProfileHeader from '@/components/profile/ProfileHeader';
import SobrietyStats from '@/components/profile/SobrietyStats';
import RelationshipCard from '@/components/profile/RelationshipCard';
import InviteCodeSection from '@/components/profile/InviteCodeSection';
import ConnectionIntentSelector from '@/components/profile/ConnectionIntentSelector';
import PersistentInviteCard from '@/components/profile/PersistentInviteCard';
import FindSupportSection from '@/components/profile/FindSupportSection';

/**
 * Render the authenticated user's profile, sobriety stats, and sponsor/sponsee management interface,
 * including controls to log slip-ups, manage invite codes, and disconnect relationships.
 *
 * @returns A React element representing the profile screen
 */
export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Account for native tab bar height and safe area
  const scrollPadding = useTabBarPadding();
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
  const [sponseeTaskStats, setSponseeTaskStats] = useState<{
    [key: string]: { total: number; completed: number };
  }>({});
  const [activeInviteCode, setActiveInviteCode] = useState<InviteCode | null>(null);
  const [isLoadingInviteCode, setLoadingInviteCode] = useState(false);
  const [pendingMatches, setPendingMatches] = useState<ConnectionMatch[]>([]);

  /**
   * Fetches the user's active invite code (not used, not revoked, not expired).
   */
  const fetchActiveInviteCode = useCallback(async () => {
    if (!profile) return;

    setLoadingInviteCode(true);
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('sponsor_id', profile.id)
        .is('used_by', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('Failed to fetch active invite code', error, {
          category: LogCategory.DATABASE,
        });
        return;
      }

      setActiveInviteCode(data);
    } catch (error) {
      logger.error('Fetch active invite code failed', error as Error, {
        category: LogCategory.DATABASE,
      });
    } finally {
      setLoadingInviteCode(false);
    }
  }, [profile]);

  /**
   * Fetches pending connection matches for the current user.
   */
  const fetchPendingMatches = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('connection_matches')
        .select('*, seeker:seeker_id(id, display_name), provider:provider_id(id, display_name)')
        .or(`seeker_id.eq.${profile.id},provider_id.eq.${profile.id}`)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch pending matches', error, {
          category: LogCategory.DATABASE,
        });
        return;
      }

      setPendingMatches(data || []);
    } catch (error) {
      logger.error('Fetch pending matches failed', error as Error, {
        category: LogCategory.DATABASE,
      });
    }
  }, [profile]);

  /**
   * Revokes the current active invite code.
   */
  const revokeInviteCode = useCallback(async () => {
    if (!activeInviteCode) return;

    const confirmed = await showConfirm(
      'Revoke Invite Code',
      'This will invalidate the current invite code. Anyone with this code will no longer be able to use it.',
      'Revoke',
      'Cancel',
      true
    );

    if (!confirmed) return;

    setLoadingInviteCode(true);
    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', activeInviteCode.id);

      if (error) {
        throw error;
      }

      setActiveInviteCode(null);
      showToast.success('Invite code revoked');
    } catch (error) {
      logger.error('Failed to revoke invite code', error as Error, {
        category: LogCategory.DATABASE,
      });
      showToast.error('Failed to revoke invite code');
    } finally {
      setLoadingInviteCode(false);
    }
  }, [activeInviteCode]);

  /**
   * Regenerates invite code (revokes old, creates new).
   */
  const regenerateInviteCode = useCallback(async () => {
    if (!profile) return;

    setLoadingInviteCode(true);
    try {
      // Revoke existing code if any (silently)
      if (activeInviteCode) {
        await supabase
          .from('invite_codes')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', activeInviteCode.id);
      }

      // Generate new code using cryptographically secure random bytes
      const randomBytes = await Crypto.getRandomBytesAsync(6);
      const code = Array.from(randomBytes)
        .map((b) => b.toString(36).padStart(2, '0'))
        .join('')
        .substring(0, 8)
        .toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          code,
          sponsor_id: profile.id,
          expires_at: expiresAt.toISOString(),
          intent: profile.connection_intent,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setActiveInviteCode(data);
      showToast.success('New invite code generated');
    } catch (error) {
      logger.error('Failed to regenerate invite code', error as Error, {
        category: LogCategory.DATABASE,
      });
      showToast.error('Failed to generate invite code');
    } finally {
      setLoadingInviteCode(false);
    }
  }, [profile, activeInviteCode]);

  /**
   * Handles connection intent change from the selector.
   */
  const handleConnectionIntentChange = useCallback(
    async (intent: ConnectionIntent | null) => {
      if (!profile) return;
      const { error } = await supabase
        .from('profiles')
        .update({ connection_intent: intent })
        .eq('id', profile.id);
      if (error) {
        showToast.error('Failed to update connection intent');
        logger.error('Failed to update connection intent', error, {
          category: LogCategory.DATABASE,
        });
      } else {
        await refreshProfile();
        showToast.success('Connection intent updated');
      }
    },
    [profile, refreshProfile]
  );

  const fetchRelationships = useCallback(async () => {
    if (!profile) return;

    setLoadingRelationships(true);
    try {
      // Only fetch non-sensitive profile fields (external_handles requires consent)
      const { data: asSponsee, error: asSponseeError } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('*, sponsor:sponsor_id(id, display_name, sobriety_date, avatar_url)')
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

      // Only fetch non-sensitive profile fields (external_handles requires consent)
      const { data: asSponsor, error: asSponsorError } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('*, sponsee:sponsee_id(id, display_name, sobriety_date, avatar_url)')
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
    fetchActiveInviteCode();
    fetchPendingMatches();
  }, [profile, fetchRelationships, fetchActiveInviteCode, fetchPendingMatches]);

  // Use hook for current user's days sober
  const {
    daysSober,
    journeyStartDate,
    currentStreakStartDate,
    hasSlipUps,
    loading: loadingDaysSober,
  } = useDaysSober();

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
        throw new Error('This invite code has expired. Please ask your sponsor for a new one.');
      }

      if (invite.sponsor_id === user.id || invite.sponsor_id === profile.id) {
        throw new Error('You cannot connect to yourself as a sponsor.');
      }

      // Check for any existing relationship (active or inactive)
      const { data: existingRelationship, error: existingRelationshipError } = await supabase
        .from('sponsor_sponsee_relationships')
        .select('id, status')
        .eq('sponsor_id', invite.sponsor_id)
        .eq('sponsee_id', user.id)
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

      if (existingRelationship?.status === 'active') {
        throw new Error('You are already connected to this sponsor.');
      }

      // Check if invite code has been used - provide contextual messages
      if (invite.used_by) {
        if (invite.used_by === user.id && existingRelationship) {
          // User used this code before and has a relationship (now inactive)
          throw new Error(
            'You previously used this invite code. Please ask your sponsor for a new code to reconnect.'
          );
        }
        // Code was used by someone else
        throw new Error(
          'This invite code has already been used. Please ask your sponsor for a new code.'
        );
      }

      // Reactivate existing inactive relationship or create new one
      if (existingRelationship) {
        // Reactivate the inactive relationship
        const { error: reactivateError } = await supabase
          .from('sponsor_sponsee_relationships')
          .update({
            status: 'active',
            disconnected_at: null,
          })
          .eq('id', existingRelationship.id);

        if (reactivateError) {
          logger.error('Failed to reactivate relationship', reactivateError as Error, {
            category: LogCategory.DATABASE,
          });
          throw new Error('Failed to reconnect with sponsor. Please try again.');
        }
      } else {
        // Create new relationship
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
          throw new Error('Failed to connect with sponsor. Please try again.');
        }
      }

      // Use user.id (auth.uid()) instead of profile.id to satisfy RLS policy
      // The WITH CHECK clause requires: used_by = auth.uid()
      const { error: updateError } = await supabase
        .from('invite_codes')
        .update({ used_by: user.id, used_at: new Date().toISOString() })
        .eq('id', invite.id);

      if (updateError) {
        // Log with context for debugging - relationship already created so this is non-blocking
        logger.error('Invite code update failed', updateError as Error, {
          category: LogCategory.DATABASE,
          context: {
            inviteId: invite.id,
            userId: user.id,
            errorCode: updateError.code,
            hint: updateError.hint,
          },
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
      showToast.success(`Connected with ${sponsorProfile.display_name ?? 'Unknown'}`);
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

      showToast.success('Successfully disconnected');
    } catch (error: unknown) {
      logger.error('Disconnect relationship failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      const message = error instanceof Error ? error.message : 'Failed to disconnect.';
      showToast.error(message);
    }
  };

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

  /**
   * Updates the reveal consent for a relationship.
   * @param relationshipId - The relationship ID
   * @param isSponsor - Whether current user is the sponsor in this relationship
   * @param consent - The new consent value
   */
  const updateRevealConsent = async (
    relationshipId: string,
    isSponsor: boolean,
    consent: boolean
  ) => {
    const columnToUpdate = isSponsor ? 'sponsor_reveal_consent' : 'sponsee_reveal_consent';

    const { error } = await supabase
      .from('sponsor_sponsee_relationships')
      .update({ [columnToUpdate]: consent })
      .eq('id', relationshipId);

    if (error) {
      logger.error('Failed to update reveal consent', error, {
        category: LogCategory.DATABASE,
      });
      showToast.error('Failed to update contact sharing preference');
    } else {
      await fetchRelationships();
      showToast.success(consent ? 'Contact sharing enabled' : 'Contact sharing disabled');
    }
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
          onPress={() => router.push('/settings')}
          style={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          accessibilityLabelledBy="profile-title"
          testID="profile-settings-button"
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
          onLogSlipUp={handleLogSlipUp}
        />

        {/* Connection Intent Selector */}
        <ConnectionIntentSelector
          value={profile?.connection_intent ?? null}
          onChange={handleConnectionIntentChange}
          theme={theme}
        />

        {/* Find Support Section (Opt-in Matching) */}
        {profile && (
          <View style={styles.section}>
            <FindSupportSection
              userId={profile.id}
              intent={profile.connection_intent}
              theme={theme}
              pendingMatches={pendingMatches}
              onMatchUpdate={() => {
                fetchPendingMatches();
                fetchRelationships();
              }}
            />
          </View>
        )}

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
            isEmpty={sponseeRelationships.length === 0 && !activeInviteCode}
            emptyMessage="No sponsees yet. Generate an invite code to get started."
            primaryButtonLabel={
              activeInviteCode
                ? '' // Hide primary button when there's an active code (actions are on the card)
                : sponseeRelationships.length > 0
                  ? 'Generate New Invite Code'
                  : 'Generate Invite Code'
            }
            showGenerateNew={sponseeRelationships.length > 0 && !activeInviteCode}
            theme={theme}
            onPrimaryAction={regenerateInviteCode}
            testIDPrefix="sponsor"
          >
            {/* Show active invite code card */}
            {activeInviteCode && (
              <PersistentInviteCard
                inviteCode={activeInviteCode}
                theme={theme}
                onRegenerate={regenerateInviteCode}
                onRevoke={revokeInviteCode}
                disabled={isLoadingInviteCode}
              />
            )}
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
                onAssignTask={() => router.push('/tasks')}
                relationship={rel}
                myHandles={profile?.external_handles}
                onConsentChange={(consent) => updateRevealConsent(rel.id, true, consent)}
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
            primaryButtonIcon="qr"
            theme={theme}
            onPrimaryAction={handleShowInviteCodeSheet}
            onSecondaryAction={
              sponsorRelationships.length > 0 ? handleShowInviteCodeSheet : undefined
            }
            testIDPrefix="sponsee"
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
                relationship={rel}
                myHandles={profile?.external_handles}
                onConsentChange={(consent) => updateRevealConsent(rel.id, false, consent)}
              />
            ))}
          </InviteCodeSection>
        )}

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
  });
