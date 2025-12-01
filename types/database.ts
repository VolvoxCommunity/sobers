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
  first_name: string;
  last_initial: string;
  phone?: string;
  avatar_url?: string;
  sobriety_date?: string;
  bio?: string;
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

export interface TaskTemplate {
  id: string;
  step_number: number;
  title: string;
  description: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
