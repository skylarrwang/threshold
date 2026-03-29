import { KanbanBoard } from '@/components/employment/KanbanBoard';
import { StickyNote } from '@/components/shared/StickyNote';
import { useJobStore } from '@/store/jobStore';

const documents = [
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

const workshops = [
  {
    id: 'ws-1',
    title: 'Mastering the Interview',
    description: 'Mock interview session with Counselor Sarah — address employment gaps with confidence.',
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

export function EmploymentPage() {
  const pipeline = useJobStore((s) => s.pipeline);
  const activeCount = pipeline?.active_count ?? 0;

  return (
    <div className="px-8 md:px-12 py-10 space-y-10 max-w-7xl mx-auto">
      {/* Page header */}
      <section className="space-y-1">
        <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
          Career Momentum
        </h2>
        <p className="text-on-surface-variant text-lg">
          {activeCount} Active Application{activeCount !== 1 ? 's' : ''}
        </p>
      </section>

      {/* Kanban board */}
      <KanbanBoard />

      {/* Documents & Workshops bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Documents & Certifications — col span 7 */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-[0_4px_16px_rgba(26,28,28,0.06)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">
                Documents &amp; Certifications
              </h3>
              <p className="text-sm text-on-surface-variant mt-0.5">
                Your professional toolkit
              </p>
            </div>
            <button className="p-2 bg-surface-container-low rounded-full hover:bg-primary-fixed transition-colors">
              <span className="material-symbols-outlined text-primary">cloud_upload</span>
            </button>
          </div>

          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer group"
              >
                <div className="w-11 h-11 bg-surface-container-lowest rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                  <span className={`material-symbols-outlined ${doc.iconColor}`}>
                    {doc.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{doc.name}</p>
                  <p className="text-xs text-on-surface-variant">{doc.detail}</p>
                </div>
                {doc.status === 'verified' && (
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    check_circle
                  </span>
                )}
                {doc.status === 'in_progress' && (
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    pending
                  </span>
                )}
                {doc.status === 'draft' && (
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    edit
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Career Workshops — col span 5 */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {workshops.map((ws) =>
            ws.featured ? (
              <div
                key={ws.id}
                className="bg-secondary-container rounded-xl p-7 text-white relative overflow-hidden flex-1"
              >
                <div className="relative z-10">
                  <span className="bg-white/20 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    Next Workshop
                  </span>
                  <h3 className="text-xl font-headline font-extrabold mt-4 mb-2">{ws.title}</h3>
                  <p className="text-sm opacity-90 mb-5 leading-relaxed">{ws.description}</p>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 rounded-xl p-3 flex flex-col items-center min-w-[52px]">
                      <span className="text-base font-black leading-none">{ws.date.split(' ')[1]}</span>
                      <span className="text-[10px] uppercase font-bold opacity-70">
                        {ws.date.split(' ')[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold">{ws.location}</p>
                      <p className="text-[11px] opacity-70">{ws.time}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-8 -right-8 opacity-10">
                  <span className="material-symbols-outlined text-[180px]">event_upcoming</span>
                </div>
              </div>
            ) : (
              <div
                key={ws.id}
                className="bg-tertiary-fixed rounded-xl p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-tertiary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-tertiary">tips_and_updates</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-sm text-on-tertiary-fixed">
                      {ws.title}
                    </h4>
                    <p className="text-xs text-on-tertiary-fixed-variant">
                      {ws.date} · {ws.location}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-tertiary-fixed group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Counselor sticky note */}
      <StickyNote author="Diana, Employment Specialist">
        Focus on the Kitchen Lead application. Your previous experience in the community garden
        gives you a unique edge — lead with that in your cover letter.
      </StickyNote>
    </div>
  );
}
