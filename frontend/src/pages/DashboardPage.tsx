import { useEffect } from 'react';
import { useProfileStore } from '@/store/profileStore';
import { ActionPlanCard } from '@/components/dashboard/ActionPlanCard';
import { AppointmentCard } from '@/components/dashboard/AppointmentCard';
import { MilestonesStepper } from '@/components/dashboard/MilestonesStepper';
import { QuickAccessGrid } from '@/components/dashboard/QuickAccessGrid';
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
  const { profile, overallProgress, loadProfile } = useProfileStore();

  useEffect(() => { loadProfile(); }, [loadProfile]);

  return (
    <div className="px-6 md:px-10 py-8 relative">
      <section className="mb-8">
        <div>
          <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">
            Welcome Back
          </span>
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
            Hello, {profile.personal.name}
          </h1>
          <p className="text-on-surface-variant max-w-2xl font-body leading-relaxed">
            Focus on the next concrete step. Your dashboard keeps the essentials close without the extra noise.
          </p>
        </div>

        <div className="mt-6">
          <QuickAccessGrid />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.15fr_0.9fr] gap-6">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/12 shadow-[0_2px_10px_rgba(26,28,28,0.05)]">
          <h3 className="text-base font-headline font-bold text-on-surface mb-4">
            Upcoming
          </h3>
          <div className="space-y-4">
            {appointments.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/12 shadow-[0_2px_10px_rgba(26,28,28,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-headline font-bold text-on-surface">
              Action Plan
            </h3>
            <button className="text-xs text-primary font-bold flex items-center gap-0.5 hover:underline">
              <span>All</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
          <div className="space-y-2.5">
            {actionItems.map((item) => (
              <ActionPlanCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/12 shadow-[0_2px_10px_rgba(26,28,28,0.05)] overflow-hidden relative">
          <h3 className="text-base font-headline font-bold text-on-surface mb-4">
            Milestone Path
          </h3>
          <MilestonesStepper milestones={milestones} />
        </div>
      </div>
    </div>
  );
}
