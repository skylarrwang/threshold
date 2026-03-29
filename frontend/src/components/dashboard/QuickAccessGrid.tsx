import { useNavigate } from 'react-router-dom';
import { useProgressSummary } from '@/hooks/useProgressSummary';

const quickAccessItems = [
  {
    path: '/housing',
    label: 'Housing',
    description: 'Track applications and housing stability tasks.',
    icon: 'home_work',
    key: 'housing' as const,
  },
  {
    path: '/employment',
    label: 'Employment',
    description: 'Review job search progress and next work steps.',
    icon: 'work_history',
    key: 'employment' as const,
  },
  {
    path: '/benefits',
    label: 'Benefits',
    description: 'Check assistance programs and enrollment status.',
    icon: 'volunteer_activism',
    key: 'benefits' as const,
  },
  {
    path: '/documents',
    label: 'Documents',
    description: 'Manage uploads and generated reentry documents.',
    icon: 'description',
    key: 'documents' as const,
  },
];

export function QuickAccessGrid() {
  const navigate = useNavigate();
  const progress = useProgressSummary();

  return (
    <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/12 shadow-[0_2px_10px_rgba(26,28,28,0.05)] p-5 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-headline font-bold text-on-surface">Quick Access</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Jump into the four areas that drive your day-to-day progress.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickAccessItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="group rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4 text-left transition-all duration-200 hover:border-primary/30 hover:bg-surface-container-low/50 hover:shadow-[0_2px_12px_rgba(26,28,28,0.04)]"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-container-low text-primary transition-colors group-hover:bg-primary/10">
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
              </div>
              <div className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary">
                {progress[item.key]}%
              </div>
            </div>
            <h4 className="text-sm font-bold text-on-surface">{item.label}</h4>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
