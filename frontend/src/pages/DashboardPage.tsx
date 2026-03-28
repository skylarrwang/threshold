import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '@/store/profileStore';
import { StickyNote } from '@/components/shared/StickyNote';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ActionPlanCard } from '@/components/dashboard/ActionPlanCard';
import { AppointmentCard } from '@/components/dashboard/AppointmentCard';
import { MilestonesStepper } from '@/components/dashboard/MilestonesStepper';
import type { ActionPlanItem, Appointment, Milestone } from '@/types';

const actionItems: ActionPlanItem[] = [
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

const appointments: Appointment[] = [
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

const milestones: Milestone[] = [
  { id: 'm-1', label: 'Identity Docs', status: 'completed' },
  { id: 'm-2', label: 'Stabilization Housing', status: 'completed' },
  { id: 'm-3', label: 'Employment Search', status: 'active' },
  { id: 'm-4', label: 'Financial Literacy', status: 'pending' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile, overallProgress } = useProfileStore();

  return (
    <div className="px-8 md:px-12 py-10 relative">
      {/* Hero Greeting Section */}
      <section className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">
              Welcome Back
            </span>
            <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
              Hello, {profile.personal.name}
            </h1>
            <p className="text-on-surface-variant max-w-lg font-body leading-relaxed">
              You're making steady progress on your reentry journey. Your counselor has updated
              your action plan for this week.
            </p>
          </div>

          {/* Overall Progress Card */}
          <div className="bg-surface-container-lowest p-6 rounded-xl w-full md:w-80 shadow-[0_2px_8px_rgba(26,28,28,0.06)]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-on-surface">Overall Progress</span>
              <span className="text-lg font-headline font-bold text-primary">
                {overallProgress}%
              </span>
            </div>
            <ProgressBar value={overallProgress} />
            <p className="text-[10px] text-on-surface-variant mt-3 text-right">
              9 of 14 milestones reached
            </p>
          </div>
        </div>
      </section>

      {/* Counselor Sticky Note */}
      <div className="mb-10">
        <StickyNote author={`${profile.support.case_worker_name ?? 'Sarah'} (Counselor)`}>
          "Tyler, great job securing your primary ID documents last week. Let's focus our energy
          on the 'Ready-to-Work' certification today. You're closer than you think."
        </StickyNote>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Action Plan — spans 2 columns */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-headline font-bold text-on-surface">
              Action Plan: Step by Step
            </h2>
            <button className="text-sm text-primary font-bold flex items-center gap-1 hover:underline">
              <span>View All Tasks</span>
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>

          <div className="space-y-4">
            {actionItems.map((item) => (
              <ActionPlanCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Upcoming Appointments */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_2px_8px_rgba(26,28,28,0.06)]">
            <h3 className="text-base font-headline font-bold text-on-surface mb-6">
              Upcoming Appointments
            </h3>
            <div className="space-y-6">
              {appointments.map((appt) => (
                <AppointmentCard key={appt.id} appointment={appt} />
              ))}
            </div>
          </div>

          {/* Milestone Path */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_2px_8px_rgba(26,28,28,0.06)] overflow-hidden relative">
            <h3 className="text-base font-headline font-bold text-on-surface mb-6">
              Milestone Path
            </h3>
            <MilestonesStepper milestones={milestones} />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/chat')}
        className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary-container hover:scale-110 transition-all z-50"
        aria-label="Open AI support chat"
      >
        <span className="material-symbols-outlined text-3xl">support_agent</span>
      </button>
    </div>
  );
}
