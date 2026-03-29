/**
 * STUB — mock data only. Replace with real API calls when backend is ready.
 * See: TODO.md #10 (frontend profile stores not wired to backend)
 *
 * This is the single source of truth for all hardcoded demo data.
 * Do not scatter mock arrays across individual store or page files.
 */

import type {
  UserProfile,
  JobApplication,
  HousingVoucher,
  ShelterInfo,
  BenefitApplication,
  Document,
  ActionPlanItem,
  Appointment,
  Milestone,
} from '@/types';

// ─── Profile ─────────────────────────────────────────────────────────────────

export const MOCK_PROFILE: UserProfile = {
  user_id: 'tyler-001',
  created_at: '2024-08-15T10:00:00Z',
  last_updated: '2024-10-20T14:30:00Z',
  personal: {
    name: 'Tyler Chen',
    age_range: '30-35',
    gender_identity: 'male',
    home_state: 'Connecticut',
    release_date: '2024-08-01',
    time_served: '3 years',
    offense_category: 'non-violent',
    comfort_with_technology: 'moderate',
  },
  situation: {
    housing_status: 'shelter',
    employment_status: 'job searching',
    benefits_enrolled: ['SNAP', 'Medicaid'],
    supervision_type: 'parole',
    supervision_end_date: '2026-08-01',
    immediate_needs: ['employment', 'permanent housing', 'transportation'],
  },
  goals: {
    short_term_goals: ['Get state ID', 'Find stable housing', 'Complete Ready-to-Work cert'],
    long_term_goals: ['Secure full-time employment', 'Financial independence', 'Reunite with family'],
    values: ['family', 'honesty', 'self-improvement'],
    strengths: ['resilience', 'communication', 'cooking skills'],
    concerns: ['employment gaps on resume', 'housing costs'],
  },
  support: {
    has_case_worker: true,
    case_worker_name: 'Diana',
    support_contacts: ['Diana (Counselor)', 'James Chen (Brother)'],
    trusted_people: ['James Chen'],
  },
  preferences: {
    communication_style: 'direct',
    check_in_frequency: 'weekly',
    wants_reminders: true,
    privacy_level: 'high',
  },
};

export const MOCK_OVERALL_PROGRESS = 64;

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const MOCK_JOBS: JobApplication[] = [
  {
    id: 'job-001',
    company: 'Hartford Culinary Group',
    title: 'Line Cook',
    status: 'applied',
    appliedDate: '2024-10-18',
    location: 'Hartford, CT',
    salary: '$18-22/hr',
    notes: 'Second Chance employer',
    logoInitial: 'H',
  },
  {
    id: 'job-002',
    company: 'New England Groundskeeping',
    title: 'Landscape Technician',
    status: 'interviewing',
    appliedDate: '2024-10-10',
    location: 'New Haven, CT',
    salary: '$20/hr',
    notes: 'Phone screen Oct 27',
    logoInitial: 'N',
  },
  {
    id: 'job-003',
    company: 'CT Transit',
    title: 'Bus Maintenance Tech',
    status: 'offer',
    appliedDate: '2024-09-28',
    location: 'Hartford, CT',
    salary: '$26/hr',
    notes: 'Offer received Oct 20 — reviewing benefits',
    logoInitial: 'C',
  },
];

// ─── Housing ──────────────────────────────────────────────────────────────────

export const MOCK_HOUSING_VOUCHER: HousingVoucher = {
  id: 'voucher-001',
  type: 'Section 8 Housing Choice',
  status: 'active',
  issuedDate: '2024-09-01',
  expiryDate: '2024-12-01',
  waitlistRank: 47,
  estimatedDate: 'November 2024',
  progressPercent: 68,
};

export const MOCK_SHELTER: ShelterInfo = {
  name: 'Capitol Region Transitional House',
  address: '85 Wethersfield Ave, Hartford, CT 06114',
  phone: '(860) 555-0187',
  checkInDate: '2024-08-05',
  notes: 'Single room, curfew 10pm. Case manager: David Rodriguez',
};

export const MOCK_MOVE_IN_CHECKLIST: { id: string; item: string; done: boolean }[] = [
  { id: 'mc-1', item: 'Section 8 voucher active', done: true },
  { id: 'mc-2', item: 'Income verification docs', done: true },
  { id: 'mc-3', item: 'Reference letter from counselor', done: false },
  { id: 'mc-4', item: 'First/last month deposit saved', done: false },
  { id: 'mc-5', item: 'Utility account setup', done: false },
];

// ─── Benefits ─────────────────────────────────────────────────────────────────

export const MOCK_BENEFITS: BenefitApplication[] = [
  {
    id: 'ben-001',
    name: 'SNAP',
    description: 'Supplemental Nutrition Assistance Program',
    status: 'active',
    monthlyAmount: 281,
    nextReviewDate: '2025-02-01',
    nextSteps: ['Recertification due Feb 2025'],
    icon: 'restaurant',
  },
  {
    id: 'ben-002',
    name: 'Medicaid',
    description: 'State Health Insurance Program',
    status: 'pending',
    nextReviewDate: '2024-11-05',
    nextSteps: ['Attend eligibility interview Nov 5', 'Bring ID and proof of residence'],
    icon: 'health_and_safety',
  },
  {
    id: 'ben-003',
    name: 'TANF Re-Entry',
    description: 'Transitional Assistance for Needy Families',
    status: 'action_needed',
    monthlyAmount: 450,
    nextSteps: ['Submit 30-day employment plan', 'Contact case worker within 5 days'],
    icon: 'support_agent',
  },
  {
    id: 'ben-004',
    name: 'LIHEAP',
    description: 'Low Income Home Energy Assistance',
    status: 'action_needed',
    nextSteps: ['Apply before Nov 30 deadline', 'Proof of energy bills required'],
    icon: 'bolt',
  },
];

export const MOCK_BENEFITS_TOTAL_MONTHLY = 731;

// ─── Documents ────────────────────────────────────────────────────────────────

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-001',
    name: 'Connecticut State ID',
    category: 'identity',
    status: 'verified',
    uploadedDate: '2024-10-12',
    expiryDate: '2028-10-12',
    notes: 'Issued at Hartford DMV',
  },
  {
    id: 'doc-002',
    name: 'Social Security Card',
    category: 'identity',
    status: 'verified',
    uploadedDate: '2024-09-20',
  },
  {
    id: 'doc-003',
    name: 'Certificate of Release',
    category: 'legal',
    status: 'verified',
    uploadedDate: '2024-08-01',
  },
  {
    id: 'doc-004',
    name: 'Birth Certificate',
    category: 'identity',
    status: 'in_progress',
    notes: 'Requested from Vital Records, expected 2-3 weeks',
  },
  {
    id: 'doc-005',
    name: 'Ready-to-Work Certificate',
    category: 'employment',
    status: 'in_progress',
    notes: 'In progress — completing vocational training',
  },
  {
    id: 'doc-006',
    name: 'Bank Account Statement',
    category: 'financial',
    status: 'missing',
    notes: 'Needed for housing application',
  },
  {
    id: 'doc-007',
    name: 'Health Insurance Card',
    category: 'health',
    status: 'missing',
    notes: 'Pending Medicaid approval',
  },
];

export const MOCK_DOCUMENTS_COMPLETION_PERCENT = 57;

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const MOCK_ACTION_ITEMS: ActionPlanItem[] = [
  {
    id: 'resume',
    title: 'Update Professional Resume',
    description:
      'Integrate your recent vocational training certifications into your standard employment profile.',
    status: 'in_progress',
    icon: 'assignment_ind',
    category: 'employment',
  },
  {
    id: 'health-insurance',
    title: 'Health Insurance Application',
    description:
      'Complete the enrollment form for state-provided health benefits and schedule your physical.',
    status: 'pending',
    icon: 'medical_services',
    category: 'health',
  },
  {
    id: 'state-id',
    title: 'State ID Pickup',
    description: 'Official identification card retrieved from the DMV office on Oct 12th.',
    status: 'done',
    icon: 'check_circle',
    category: 'identity',
  },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-1',
    title: 'Career Workshop',
    date: '2026-10-24',
    time: '10:00 AM',
    location: 'Community Center',
    type: 'employment',
  },
  {
    id: 'appt-2',
    title: 'Counseling Review',
    date: '2026-10-27',
    time: '02:30 PM',
    location: 'Virtual Call',
    type: 'counseling',
  },
];

export const MOCK_MILESTONES: Milestone[] = [
  { id: 'm-1', label: 'Identity Docs', status: 'completed' },
  { id: 'm-2', label: 'Stabilization Housing', status: 'completed' },
  { id: 'm-3', label: 'Employment Search', status: 'active' },
  { id: 'm-4', label: 'Financial Literacy', status: 'pending' },
];

// ─── Employment page ──────────────────────────────────────────────────────────

export const MOCK_EMPLOYMENT_DOCS: {
  id: string;
  name: string;
  detail: string;
  icon: string;
  iconColor: string;
  status: string;
}[] = [
  {
    id: 'doc-1',
    name: 'State ID',
    detail: 'Verified by counselor',
    icon: 'badge',
    iconColor: 'text-primary',
    status: 'verified',
  },
  {
    id: 'doc-2',
    name: 'Resume (draft)',
    detail: 'Last edited Oct 24',
    icon: 'description',
    iconColor: 'text-on-surface-variant',
    status: 'draft',
  },
  {
    id: 'doc-3',
    name: 'Ready-to-Work Certificate',
    detail: 'In progress — est. Nov 10',
    icon: 'workspace_premium',
    iconColor: 'text-secondary',
    status: 'in_progress',
  },
];

export const MOCK_WORKSHOPS: {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  featured: boolean;
}[] = [
  {
    id: 'ws-1',
    title: 'Mastering the Interview',
    description:
      'Mock interview session with Counselor Sarah — address employment gaps with confidence.',
    date: 'Oct 28',
    time: '2:00 – 3:30 PM',
    location: 'Central Community Hall',
    featured: true,
  },
  {
    id: 'ws-2',
    title: 'Resume & LinkedIn Basics',
    description: 'Build a compelling resume and digital presence from scratch.',
    date: 'Nov 4',
    time: '10:00 – 11:30 AM',
    location: 'Hartford Workforce Center',
    featured: false,
  },
];
