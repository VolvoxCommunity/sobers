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
   * Whether to show 12-step program content (Program tab).
   * Default true. When false, the Program tab is hidden from navigation
   * and related Home screen cards are hidden.
   * Existing users (null/undefined) are treated as true.
   */
  show_program_content?: boolean;
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

// =============================================================================
// Program Section Types
// =============================================================================

export type ProgramType = 'aa' | 'na';
export type PrayerCategory = 'step' | 'common' | 'aa' | 'na';
export type MeetingType = 'aa' | 'na' | 'other';
export type ReadingPreference = 'aa' | 'na' | 'both';

/**
 * Daily reading content (fallback for external APIs).
 */
export interface DailyReading {
  id: string;
  program: ProgramType;
  month: number;
  day: number;
  title: string;
  content: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

/**
 * User's preferred reading program.
 */
export interface UserReadingPreferences {
  id: string;
  user_id: string;
  preferred_program: ReadingPreference;
  created_at: string;
  updated_at: string;
}

/**
 * Record of a user viewing a daily reading.
 */
export interface UserReadingHistory {
  id: string;
  user_id: string;
  reading_date: string;
  program: ProgramType;
  viewed_at: string;
}

/**
 * Prayer content.
 */
export interface Prayer {
  id: string;
  title: string;
  content: string;
  category: PrayerCategory;
  step_number?: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * User's favorited prayer.
 */
export interface UserPrayerFavorite {
  id: string;
  user_id: string;
  prayer_id: string;
  created_at: string;
  prayer?: Prayer;
}

/**
 * Record of a user viewing a prayer.
 */
export interface UserPrayerHistory {
  id: string;
  user_id: string;
  prayer_id: string;
  viewed_at: string;
}

/**
 * Literature book metadata.
 */
export interface LiteratureBook {
  id: string;
  title: string;
  program: ProgramType;
  chapter_count: number;
  external_url?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  chapters?: LiteratureChapter[];
}

/**
 * Literature book chapter.
 */
export interface LiteratureChapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  page_range?: string;
  created_at: string;
}

/**
 * User's added/visible book.
 */
export interface UserLiteratureBook {
  id: string;
  user_id: string;
  book_id: string;
  is_visible: boolean;
  added_at: string;
  book?: LiteratureBook;
}

/**
 * User's chapter completion.
 */
export interface UserLiteratureProgress {
  id: string;
  user_id: string;
  chapter_id: string;
  completed_at: string;
}

/**
 * User's logged meeting.
 */
export interface UserMeeting {
  id: string;
  user_id: string;
  meeting_name: string;
  meeting_type: MeetingType;
  location?: string;
  attended_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Milestone achieved for meeting attendance.
 */
export interface UserMeetingMilestone {
  id: string;
  user_id: string;
  milestone_type: 'count' | 'streak' | 'monthly';
  milestone_value: number;
  achieved_at: string;
}

/**
 * Cached user program statistics.
 */
export interface UserProgramStats {
  id: string;
  user_id: string;
  reading_current_streak: number;
  reading_longest_streak: number;
  reading_total_count: number;
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
