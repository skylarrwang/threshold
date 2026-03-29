import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProfileStore } from '@/store/profileStore';
import { useDocumentsStore } from '@/store/documentsStore';
import { useProgressSummary } from '@/hooks/useProgressSummary';
import { ProgressBar } from '@/components/shared/ProgressBar';

const progressItems = [
  { path: '/housing', icon: 'home', label: 'Housing', key: 'housing' as const },
  { path: '/employment', icon: 'work', label: 'Employment', key: 'employment' as const },
  { path: '/benefits', icon: 'payments', label: 'Benefits', key: 'benefits' as const },
  { path: '/documents', icon: 'folder_open', label: 'Documents', key: 'documents' as const },
];

const navItems = [
  { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/ai-applications', icon: 'smart_toy', label: 'AI Apps' },
  { path: '/resources', icon: 'people', label: 'Resources' },
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

export function RightPanel({ onClose }: { onClose?: () => void }) {
  const { profile } = useProfileStore();
  const progress = useProgressSummary();
  const navigate = useNavigate();

  useEffect(() => {
    useDocumentsStore.getState().fetchCompletion();
  }, []);

  return (
    <aside className="h-screen w-72 overflow-y-auto bg-surface-container-low flex flex-col py-8 no-scrollbar">
      {/* Branding */}
      <div className="px-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-headline font-bold text-on-surface mb-0.5">Threshold</h1>
          <p className="text-xs font-medium text-on-surface-variant tracking-wider">The Guided Path</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 hover:bg-surface-container-lowest rounded-xl transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Overall progress */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-on-surface">Overall</span>
          <span className="text-lg font-headline font-bold text-primary">{progress.overall}%</span>
        </div>
        <ProgressBar value={progress.overall} />
      </div>

      {/* Progress breakdown */}
      <div className="px-3 mb-4">
        <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-outline">
          Progress
        </p>
        <div className="space-y-1">
          {progressItems.map((item) => {
            const value = progress[item.key];
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  onClose?.();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 hover:bg-surface-container-lowest/60 text-left group"
              >
                <span className="material-symbols-outlined text-xl text-on-surface-variant group-hover:text-primary transition-colors">
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-label text-on-surface">{item.label}</span>
                    <span className="text-xs font-bold text-on-surface-variant">{value}%</span>
                  </div>
                  <ProgressBar value={value} />
                </div>
                <span className="material-symbols-outlined text-base text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                  chevron_right
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-6 border-t border-outline-variant/15" />

      {/* Chat CTA */}
      <div className="px-3 my-4">
        <NavLink
          to="/chat"
          onClick={() => onClose?.()}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-label text-sm',
              isActive
                ? 'bg-primary text-on-primary font-bold shadow-md'
                : 'bg-primary-container text-on-primary-container font-semibold hover:bg-primary hover:text-on-primary'
            )
          }
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}
          >
            support_agent
          </span>
          <span>Talk to Threshold</span>
        </NavLink>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-label text-sm',
                  isActive
                    ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" : undefined }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User profile */}
      <div className="px-6 mt-6">
        <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/20">
          <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-sm font-bold text-on-primary-fixed">
            {profile.personal.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-bold text-on-surface">{profile.personal.name}</div>
            <div className="text-[10px] uppercase text-on-surface-variant tracking-widest">Member</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
