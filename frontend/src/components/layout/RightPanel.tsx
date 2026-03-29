import { useEffect, useState } from 'react';
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

interface RightPanelProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function RightPanel({
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: RightPanelProps) {
  const { profile } = useProfileStore();
  const progress = useProgressSummary();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    useDocumentsStore.getState().fetchCompletion();
  }, []);

  return (
    <div
      className={cn(
        'relative h-screen transition-[width] duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-72'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isCollapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className={cn(
            'absolute -right-3 top-7 z-10 hidden md:flex items-center justify-center rounded-md border border-outline-variant/30 bg-surface-container-lowest p-1 text-on-surface-variant shadow-sm transition-all duration-200 hover:text-primary hover:shadow-md',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <span className="material-symbols-outlined text-base">chevron_right</span>
        </button>
      )}

      <aside className="h-screen overflow-y-auto bg-surface-container-low flex flex-col py-8 no-scrollbar">
        {/* Branding */}
        <div
          className={cn(
            'mb-6 flex items-center',
            isCollapsed ? 'px-3 justify-center' : 'px-6 justify-between'
          )}
        >
          <div className={cn('flex items-center min-w-0', isCollapsed ? 'justify-center' : 'gap-3')}>
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-sm font-bold text-on-primary-fixed shrink-0">
              T
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-headline font-bold text-on-surface mb-0.5">Threshold</h1>
                <p className="text-xs font-medium text-on-surface-variant tracking-wider">The Guided Path</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="hidden md:flex p-1.5 hover:bg-surface-container-lowest rounded-xl transition-colors text-on-surface-variant"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="md:hidden p-1.5 hover:bg-surface-container-lowest rounded-xl transition-colors text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              )}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <>
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
          </>
        )}

        {/* Chat CTA */}
        <div className={cn('my-4', isCollapsed ? 'px-3' : 'px-3')}>
          <NavLink
            to="/chat"
            onClick={() => onClose?.()}
            title={isCollapsed ? 'Talk to Threshold' : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-xl transition-all duration-200 font-label text-sm',
                isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3',
                isActive
                  ? 'bg-primary text-on-primary font-bold shadow-md'
                  : 'bg-primary-container text-on-primary-container font-semibold hover:bg-primary hover:text-on-primary'
              )
            }
          >
            <span
              className="material-symbols-outlined text-xl shrink-0"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}
            >
              support_agent
            </span>
            {!isCollapsed && <span>Talk to Threshold</span>}
          </NavLink>
        </div>

        {/* Nav links */}
        <nav className={cn('flex-1', isCollapsed ? 'px-3' : 'px-3')}>
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose?.()}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-xl transition-all duration-200 font-label text-sm',
                    isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3',
                    isActive
                      ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/60'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="material-symbols-outlined text-xl shrink-0"
                      style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" : undefined }}
                    >
                      {item.icon}
                    </span>
                    {!isCollapsed && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User profile */}
        <div className={cn('mt-6', isCollapsed ? 'px-3' : 'px-6')}>
          <div
            className={cn(
              'pt-4 border-t border-outline-variant/20',
              isCollapsed ? 'flex justify-center' : 'flex items-center gap-3'
            )}
            title={isCollapsed ? profile.personal.name : undefined}
          >
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-sm font-bold text-on-primary-fixed">
              {profile.personal.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            {!isCollapsed && (
              <div>
                <div className="text-sm font-bold text-on-surface">{profile.personal.name}</div>
                <div className="text-[10px] uppercase text-on-surface-variant tracking-widest">Member</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
