import { useProfileStore } from '@/store/profileStore';
import { useChatStore } from '@/store/chatStore';
import { useChatSocket } from '@/lib/websocket';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ActionPlanCard } from '@/components/dashboard/ActionPlanCard';
import { AppointmentCard } from '@/components/dashboard/AppointmentCard';
import { MilestonesStepper } from '@/components/dashboard/MilestonesStepper';
import { MessageThread } from '@/components/chat/MessageThread';
import { ChatInput } from '@/components/chat/ChatInput';
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
  const { profile, overallProgress } = useProfileStore();
  const { setActiveConversation } = useChatStore();
  const { sendMessage } = useChatSocket();

  // Ensure AI conversation is active for the embedded chat
  const handleChatSend = (content: string) => {
    setActiveConversation('conv-002');
    sendMessage(content);
  };

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
              You're making steady progress on your reentry journey.
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

      {/* Embedded Chat */}
      <section className="mb-10">
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_rgba(26,28,28,0.06)] overflow-hidden flex flex-col h-[400px]">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-outline-variant/10">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span
                className="material-symbols-outlined text-on-primary text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                support_agent
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Threshold AI</h3>
              <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                Active now
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <MessageThread />
          </div>
          <ChatInput onSend={handleChatSend} />
        </div>
      </section>

      {/* Three-column grid: Appointments | Action Plan | Milestones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_2px_8px_rgba(26,28,28,0.06)]">
          <h3 className="text-base font-headline font-bold text-on-surface mb-6">
            Upcoming
          </h3>
          <div className="space-y-6">
            {appointments.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        </div>

        {/* Action Plan */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_2px_8px_rgba(26,28,28,0.06)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-headline font-bold text-on-surface">
              Action Plan
            </h3>
            <button className="text-xs text-primary font-bold flex items-center gap-0.5 hover:underline">
              <span>All</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
          <div className="space-y-3">
            {actionItems.map((item) => (
              <ActionPlanCard key={item.id} item={item} />
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
  );
}
