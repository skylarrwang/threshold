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

export type HousingStatus = 'active' | 'pending' | 'expired';

export interface HousingVoucher {
  id: string;
  type: string;
  status: HousingStatus;
  issuedDate: string;
  expiryDate: string;
  waitlistRank?: number;
  estimatedDate?: string;
  progressPercent: number;
}

export interface ShelterInfo {
  name: string;
  address: string;
  phone: string;
  checkInDate: string;
  checkOutDate?: string;
  notes: string;
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
