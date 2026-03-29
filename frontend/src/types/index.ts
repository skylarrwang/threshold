export interface PersonalContext {
  name: string;
  age_range: string;
  gender_identity?: string;
  home_state: string;
  release_date: string;
  time_served: string;
  offense_category: 'non-violent' | 'violent' | 'drug' | 'financial' | 'other';
  comfort_with_technology: string;
}

export interface SituationContext {
  housing_status: 'housed' | 'shelter' | 'couch_surfing' | 'unhoused' | 'unknown';
  employment_status: string;
  benefits_enrolled: string[];
  supervision_type: 'none' | 'probation' | 'parole' | 'supervised_release';
  supervision_end_date?: string;
  immediate_needs: string[];
}

export interface GoalsContext {
  short_term_goals: string[];
  long_term_goals: string[];
  values: string[];
  strengths: string[];
  concerns: string[];
}

export interface SupportContext {
  has_case_worker: boolean;
  case_worker_name?: string;
  support_contacts: string[];
  trusted_people: string[];
}

export interface PreferenceContext {
  communication_style: 'direct' | 'gentle' | 'informational';
  check_in_frequency: 'daily' | 'weekly' | 'as_needed';
  wants_reminders: boolean;
  privacy_level: 'high' | 'medium' | 'low';
}

export interface UserProfile {
  user_id: string;
  created_at: string;
  last_updated: string;
  personal: PersonalContext;
  situation: SituationContext;
  goals: GoalsContext;
  support: SupportContext;
  preferences: PreferenceContext;
}

export type JobStatus = 'applied' | 'interviewing' | 'offer' | 'rejected' | 'saved';

export interface JobApplication {
  id: string;
  company: string;
  title: string;
  status: JobStatus;
  appliedDate: string;
  location: string;
  salary?: string;
  notes?: string;
  logoInitial: string;
}

export type HousingPipelineStage =
  | 'discovered'
  | 'documents_ready'
  | 'applied'
  | 'waitlisted'
  | 'interview_scheduled'
  | 'approved'
  | 'denied'
  | 'moved_in';

export interface HousingApplication {
  id: string;
  program: string;
  status: HousingPipelineStage;
  notes: string;
  created_at: string;
  updated_at: string;
  follow_up_date?: string;
  contact_name?: string;
  contact_phone?: string;
  next_action?: string;
  stage_label?: string;
  history: { status: string; notes: string; date: string }[];
}

export interface HousingPipelineSummary {
  applications: HousingApplication[];
  active_count: number;
  total_count: number;
  approved_count: number;
  next_follow_up?: { program: string; date: string };
  stages: { key: HousingPipelineStage; label: string }[];
}

export interface FairChanceLaw {
  state: string;
  summary: string;
  scope: string;
  resource: string;
  has_law: boolean;
}

export type BenefitStatus = 'active' | 'pending' | 'action_needed' | 'expired';

export interface BenefitApplication {
  id: string;
  name: string;
  description: string;
  status: BenefitStatus;
  monthlyAmount?: number;
  nextReviewDate?: string;
  nextSteps?: string[];
  icon: string;
}

export type DocumentStatus = 'verified' | 'in_progress' | 'missing' | 'expired';

export interface Document {
  id: string;
  name: string;
  category: 'identity' | 'legal' | 'employment' | 'financial' | 'health';
  status: DocumentStatus;
  uploadedDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  isAI?: boolean;
}

export interface Conversation {
  id: string;
  participantName: string;
  participantType: 'counselor' | 'ai' | 'resource';
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  isOnline: boolean;
  avatar?: string;
}

export type AgentStatus = 'running' | 'waiting' | 'completed' | 'failed';

export interface AgentStep {
  id: string;
  stepType: 'thinking' | 'subagent' | 'tool' | 'node' | 'reasoning';
  status: 'started' | 'completed';
  label: string;
  detail?: string;
  icon?: string;
  timestamp: number;
}

export interface GeneratedDocument {
  id: string;
  type: 'cover_letter' | 'resume' | 'housing_letter' | 'legal_letter';
  title: string;
  content: string;
  createdAt: string;
  wordCount: number;
}

export interface Milestone {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'pending';
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'counseling' | 'employment' | 'health' | 'legal' | 'other';
}

export interface ActionPlanItem {
  id: string;
  title: string;
  description: string;
  status: 'in_progress' | 'pending' | 'done';
  icon: string;
  category: string;
}
