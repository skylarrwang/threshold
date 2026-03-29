// STUB: placeholder page — not yet implemented. All data below is mock/demo only.
import { ProgressBar } from '@/components/shared/ProgressBar';
import { StatusDot } from '@/components/shared/StatusDot';
import type { AgentStatus } from '@/types';

interface AgentData {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  progressPercent: number;
  currentTask?: string;
  applications: number;
  icon: string;
}

interface AppHistoryRow {
  company: string;
  type: string;
  date: string;
  status: 'interview' | 'submitted' | 'awaiting' | 'rejected';
}

const MOCK_AGENTS: AgentData[] = [
  {
    id: 'agent-001',
    name: 'Job Application Agent',
    description: 'Scanning job boards and applying to matching positions',
    status: 'running',
    progressPercent: 68,
    currentTask: 'Reviewing Green Roots Landscaping posting',
    applications: 12,
    icon: 'work',
  },
  {
    id: 'agent-002',
    name: 'Housing Search Agent',
    description: 'Monitoring Section 8 waitlists and vacancies',
    status: 'running',
    progressPercent: 45,
    currentTask: 'Checking CT Housing Finance Authority updates',
    applications: 8,
    icon: 'home_work',
  },
  {
    id: 'agent-003',
    name: 'Benefits Optimizer',
    description: 'Finding additional benefit programs you qualify for',
    status: 'completed',
    progressPercent: 100,
    applications: 4,
    icon: 'payments',
  },
];

const APP_HISTORY: AppHistoryRow[] = [
  { company: 'FedEx Ground Crew', type: 'Logistics & Handling', date: 'Oct 24, 2024', status: 'interview' },
  { company: 'Starbucks Barista', type: 'Retail & Hospitality', date: 'Oct 20, 2024', status: 'submitted' },
  { company: 'Housing Voucher Sub.', type: 'Public Assistance', date: 'Oct 18, 2024', status: 'awaiting' },
  { company: 'Amazon Fulfillment', type: 'Warehouse & Logistics', date: 'Oct 15, 2024', status: 'submitted' },
  { company: 'SNAP Benefits', type: 'State Social Services', date: 'Oct 12, 2024', status: 'awaiting' },
];

const statusPillClass: Record<AppHistoryRow['status'], string> = {
  interview: 'bg-secondary-fixed text-on-secondary-fixed',
  submitted: 'bg-primary-fixed/40 text-primary',
  awaiting: 'bg-surface-container-high text-on-surface-variant',
  rejected: 'bg-error-container text-on-error-container',
};

const statusPillLabel: Record<AppHistoryRow['status'], string> = {
  interview: 'Interview Scheduled',
  submitted: 'Submitted',
  awaiting: 'Awaiting Response',
  rejected: 'Not Selected',
};

const ACTION_ITEMS = [
  { icon: 'description', text: 'Provide work history for resume', action: 'Add Info' },
  { icon: 'contact_mail', text: 'Confirm contact details for cover letter', action: 'Review' },
];

const IMPACT_STATS = [
  { icon: 'send', label: 'Applications Sent', value: '47' },
  { icon: 'mark_email_read', label: 'Responses Received', value: '12' },
  { icon: 'calendar_month', label: 'Interviews Scheduled', value: '3' },
];

export function AIApplicationsPage() {
  return (
    <div className="px-8 md:px-12 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <span className="text-primary font-bold tracking-[0.15em] text-[10px] uppercase">Intelligent Automation</span>
          <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mt-1">
            AI Applications
          </h1>
        </div>
        <div className="text-right pb-1">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-0.5">Monthly Success Rate</p>
          <p className="text-3xl font-black text-primary">87%</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 space-y-10">
          {/* Information Needed */}
          <section className="bg-tertiary-fixed rounded-2xl p-8 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-on-tertiary-fixed-variant mb-4">
                <span className="material-symbols-outlined text-xl">pending_actions</span>
                <span className="font-bold text-xs uppercase tracking-[0.1em]">Information Needed</span>
              </div>
              <h2 className="text-2xl font-headline font-extrabold text-on-tertiary-fixed mb-6 leading-tight">
                {ACTION_ITEMS.length} action items require your attention to proceed.
              </h2>
              <div className="space-y-3">
                {ACTION_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white/70 backdrop-blur-md px-5 py-4 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-tertiary">{item.icon}</span>
                      <span className="font-semibold text-on-surface text-sm">{item.text}</span>
                    </div>
                    <button className="text-primary font-bold text-sm hover:underline shrink-0">
                      {item.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-tertiary-container/20 rounded-full blur-[80px] pointer-events-none" />
          </section>

          {/* Active Agent Tracking */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-xl font-bold text-on-surface">Active AI Agent Tracking</h2>
              <div className="flex items-center gap-2 bg-primary-fixed/20 text-primary text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                Real-time Processing
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-surface-container-lowest rounded-xl p-6 flex flex-col gap-4 hover:shadow-sm transition-all duration-200"
                >
                  {/* Top */}
                  <div className="flex items-start justify-between">
                    <div className="bg-primary-fixed/20 p-3 rounded-xl">
                      <span className="material-symbols-outlined text-primary">{agent.icon}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusDot online={agent.status === 'running'} pulse={agent.status === 'running'} />
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${agent.status === 'running' ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {agent.status === 'running' ? 'Active' : 'Complete'}
                      </span>
                    </div>
                  </div>

                  {/* Name & description */}
                  <div>
                    <h3 className="font-headline font-bold text-on-surface leading-tight">{agent.name}</h3>
                    <p className="text-xs text-on-surface-variant mt-1">{agent.description}</p>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                      <span>Progress</span>
                      <span className="text-primary">{agent.progressPercent}%</span>
                    </div>
                    <ProgressBar value={agent.progressPercent} />
                  </div>

                  {/* Current task */}
                  {agent.currentTask && (
                    <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-lg">
                      <span className="material-symbols-outlined text-sm text-primary animate-spin" style={{ animationDuration: '3s' }}>sync</span>
                      <span className="text-xs text-on-surface-variant">{agent.currentTask}</span>
                    </div>
                  )}

                  {/* Applications count */}
                  <div className="flex items-center gap-2 mt-auto pt-1 border-t border-outline-variant/10">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">send</span>
                    <span className="text-xs font-bold text-on-surface">{agent.applications} applications</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Application History Table */}
          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-6">Application History</h2>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Entity / Position</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center hidden sm:table-cell">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {APP_HISTORY.map((row, i) => (
                    <tr key={i} className="border-t border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-on-surface text-sm leading-tight">{row.company}</div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">{row.type}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant text-center hidden sm:table-cell">{row.date}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${statusPillClass[row.status]}`}>
                          {statusPillLabel[row.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-primary font-bold text-sm hover:underline">View Log</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <aside className="col-span-12 lg:col-span-4 space-y-8">
          {/* Live Status Widget */}
          <div className="bg-secondary text-on-secondary rounded-2xl p-8 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-primary-fixed rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Live System Status</span>
              </div>
              <h3 className="text-2xl font-headline font-extrabold mb-3 leading-tight">
                Currently active on {MOCK_AGENTS.filter(a => a.status === 'running').length} applications
              </h3>
              <p className="text-on-secondary/70 text-sm leading-relaxed mb-6">
                Your AI assistant is scanning for updates every 15 minutes and responding to documentation requests.
              </p>
              <div className="bg-white/10 p-4 rounded-xl flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-primary-fixed">psychology</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Last Action</p>
                  <p className="text-sm font-semibold">Job Application Updated</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
          </div>

          {/* Automation Impact Stats */}
          <div className="bg-surface-container-lowest rounded-xl p-6 space-y-6">
            <h4 className="font-headline font-bold text-on-surface">Automation Impact</h4>
            {IMPACT_STATS.map((stat, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-black text-on-surface">{stat.value}</p>
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wide">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
