// =============================================================================
// Type Definitions
// =============================================================================
export type RelationshipStatus = 'pending' | 'active' | 'inactive';
export type TaskStatus = 'assigned' | 'in_progress' | 'completed';
export type NotificationType =
  | 'task_assigned'
  | 'milestone'
  | 'message'
  | 'connection_request'
  | 'task_completed';

/**
 * Status of a connection match proposal.
 */
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

/**
 * User's stated intent for sponsor/sponsee connections.
 * Used for opt-in matching and invite code context.
 */
export type ConnectionIntent =
  | 'not_looking'
  | 'seeking_sponsor'
  | 'open_to_sponsoring'
  | 'open_to_both';

/**
 * External platform handles for out-of-app communication.
 * Only revealed with mutual consent per-connection.
 */
export interface ExternalHandles {
  discord?: string;
  telegram?: string;
  whatsapp?: string;
  signal?: string;
  phone?: string;
}

// =============================================================================
// Database Interfaces
// =============================================================================

/**
 * User profile information.
 *
 * @remarks
 * Users can be both sponsors (helping others) and sponsees (being helped)
 * simultaneously through different relationships. There is no role field -
 * the role is determined by the relationship context.
 */
export interface Profile {
  id: string;
  email: string;
  /**
   * User's display name shown throughout the app.
   * Free-form text (2-30 chars) that users can customize.
   * May be auto-populated from OAuth sign-in (e.g., Apple Sign In) and
   * can be edited during onboarding or in account settings.
   * Null until explicitly set.
   */
  display_name: string | null;
  avatar_url?: string;
  /**
   * The date when the user's recovery journey began (YYYY-MM-DD format).
   *
   * @remarks
   * **IMPORTANT**: This field represents the original journey start date and is
   * NEVER updated when a slip-up occurs. Slip-ups are tracked separately in the
   * `slip_ups` table with their own `recovery_restart_date`. The `useDaysSober`
   * hook uses both fields to calculate journey duration and current streak.
   *
   * - `sobriety_date`: Original journey start (immutable after onboarding)
   * - `slip_ups.recovery_restart_date`: Current streak start (when slip-up exists)
   */
  sobriety_date?: string;
  bio?: string;
  /**
   * User's timezone as an IANA timezone identifier (e.g., "America/New_York").
   * Used for displaying dates and times in the user's local timezone.
   * @remarks Optional for backward compatibility with existing profiles.
   * Should be required for new profiles.
   */
  timezone?: string;
  /**
   * Timestamp when the user accepted the Privacy Policy and Terms of Service.
   * Null until accepted during onboarding.
   * @remarks Stored as ISO 8601 timestamp for legal audit trail.
   */
  terms_accepted_at?: string;
  /**
   * Historical spending amount on addiction in USD.
   * Nullable - only set if user opts into savings tracking during onboarding.
   */
  spend_amount?: number | null;
  /**
   * Frequency of the spending amount.
   * Used with spend_amount to calculate daily spending rate.
   */
  spend_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  /**
   * Whether to hide the Money Saved card from dashboard.
   * User preference set via three-dot menu on card or Settings.
   */
  hide_savings_card?: boolean;
  /**
   * Last "What's New" release version the user has seen.
   * Used to determine if the What's New popup should be shown.
   * Null if user hasn't seen any What's New content.
   */
  last_seen_version?: string | null;
  /**
   * Whether to show 12-step program content (Steps tab).
   * Default true. When false, the Steps tab is hidden from navigation.
   * Existing users (null/undefined) are treated as true.
   */
  show_twelve_step_content?: boolean;
  /**
   * User's stated intent for sponsor/sponsee connections.
   * Used for opt-in matching and invite code context.
   */
  connection_intent?: ConnectionIntent | null;
  /**
   * External platform handles stored privately.
   * Only revealed with mutual consent per-connection.
   */
  external_handles?: ExternalHandles;
  notification_preferences: {
    tasks: boolean;
    messages: boolean;
    milestones: boolean;
    daily: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface SponsorSponseeRelationship {
  id: string;
  sponsor_id: string;
  sponsee_id: string;
  status: RelationshipStatus;
  connected_at: string;
  disconnected_at?: string;
  /**
   * Whether sponsor has opted in to reveal their external handles to this sponsee.
   */
  sponsor_reveal_consent?: boolean;
  /**
   * Whether sponsee has opted in to reveal their external handles to this sponsor.
   */
  sponsee_reveal_consent?: boolean;
  created_at: string;
  sponsor?: Profile;
  sponsee?: Profile;
}

export interface InviteCode {
  id: string;
  code: string;
  sponsor_id: string;
  expires_at: string;
  used_by?: string;
  used_at?: string;
  /**
   * Timestamp when the invite code was manually revoked by the sponsor.
   */
  revoked_at?: string | null;
  /**
   * The connection intent the sponsor had when creating this invite code.
   */
  intent?: ConnectionIntent | null;
  created_at: string;
  sponsor?: Profile;
}

export interface StepContent {
  id: string;
  step_number: number;
  title: string;
  description: string;
  detailed_content: string;
  reflection_prompts: string[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  sponsor_id: string;
  sponsee_id: string;
  step_number?: number;
  title: string;
  description: string;
  due_date?: string;
  status: TaskStatus;
  completion_notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  sponsor?: Profile;
  sponsee?: Profile;
}

export interface SlipUp {
  id: string;
  user_id: string;
  slip_up_date: string;
  recovery_restart_date: string;
  notes?: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at?: string;
  created_at: string;
  sender?: Profile;
  recipient?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  data: any;
  read_at?: string;
  created_at: string;
}

export interface UserStepProgress {
  id: string;
  user_id: string;
  step_number: number;
  completed: boolean;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: string;
  step_number: number;
  title: string;
  description: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * A system-proposed match between a user seeking a sponsor and a potential sponsor.
 * Part of the opt-in matching system where both parties must accept to connect.
 *
 * @remarks
 * Matches are created when users with complementary intents are found:
 * - seeking_sponsor ↔ open_to_sponsoring
 * - open_to_both can match with either side
 *
 * Both seeker_accepted and provider_accepted must be true for a relationship to form.
 */
export interface ConnectionMatch {
  id: string;
  /** User with intent seeking_sponsor or open_to_both */
  seeker_id: string;
  /** User with intent open_to_sponsoring or open_to_both */
  provider_id: string;
  /** Seeker's acceptance: null=pending, true=accepted, false=rejected */
  seeker_accepted: boolean | null;
  /** Provider's acceptance: null=pending, true=accepted, false=rejected */
  provider_accepted: boolean | null;
  /** Overall match status */
  status: MatchStatus;
  /** Relationship ID created when both accept */
  relationship_id?: string | null;
  created_at: string;
  /** Match expires after 7 days if not resolved */
  expires_at: string;
  /** Timestamp when match was resolved (accepted/rejected/expired) */
  resolved_at?: string | null;
  /** Joined seeker profile data */
  seeker?: Profile;
  /** Joined provider profile data */
  provider?: Profile;
}

/**
 * Result from find_potential_matches database function.
 */
export interface PotentialMatch {
  matched_user_id: string;
  matched_intent: ConnectionIntent;
  display_name: string | null;
}
