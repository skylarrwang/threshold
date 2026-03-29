import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProfileStore } from '@/store/profileStore';
import { useDocumentsStore } from '@/store/documentsStore';
import { useHousingStore } from '@/store/housingStore';
import { useJobStore } from '@/store/jobStore';
import { useProgressSummary } from '@/hooks/useProgressSummary';
import { ProgressBar } from '@/components/shared/ProgressBar';

const progressItems = [
  { path: '/housing', icon: 'home_work', label: 'Housing', key: 'housing' as const, stageLabelKey: 'housingStageLabel' as const },
  { path: '/employment', icon: 'work_history', label: 'Employment', key: 'employment' as const, stageLabelKey: 'employmentStageLabel' as const },
  { path: '/benefits', icon: 'volunteer_activism', label: 'Benefits', key: 'benefits' as const, stageLabelKey: undefined },
  { path: '/documents', icon: 'description', label: 'Documents', key: 'documents' as const, stageLabelKey: undefined },
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
  const { profile, loadProfile, isLoading } = useProfileStore();
  const housingAlerts = useHousingStore((s) => s.alerts);
  const jobAlerts = useJobStore((s) => s.alerts);
  const progress = useProgressSummary();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    loadProfile();
    useDocumentsStore.getState().fetchCompletion();
    useHousingStore.getState().fetchPipeline();
    useHousingStore.getState().fetchAlerts();
    useJobStore.getState().fetchPipeline();
    useJobStore.getState().fetchAlerts();
  }, [loadProfile]);

  // Build prioritized alert nudges (max 2)
  const alertNudges = useMemo(() => {
    const items: { color: string; text: string; path: string }[] = [];

    // Overdue items (red)
    for (const o of housingAlerts?.overdue ?? []) {
      items.push({ color: 'bg-error', text: `${o.program} — ${o.days_overdue}d overdue`, path: '/housing' });
    }
    for (const o of jobAlerts?.overdue ?? []) {
      items.push({ color: 'bg-error', text: `${o.company} — ${o.days_overdue}d overdue`, path: '/employment' });
    }
    // Deadlines (amber)
    for (const d of housingAlerts?.deadlines_soon ?? []) {
      items.push({ color: 'bg-tertiary', text: `${d.program} deadline in ${d.days_left}d`, path: '/housing' });
    }
    for (const d of jobAlerts?.deadlines_soon ?? []) {
      items.push({ color: 'bg-tertiary', text: `${d.company} deadline in ${d.days_left}d`, path: '/employment' });
    }
    // Upcoming interviews (blue)
    for (const i of housingAlerts?.interviews_upcoming ?? []) {
      items.push({ color: 'bg-secondary', text: `${i.program} interview ${i.interview_date}`, path: '/housing' });
    }
    for (const i of jobAlerts?.interviews_upcoming ?? []) {
      items.push({ color: 'bg-secondary', text: `${i.company} interview ${i.interview_date}`, path: '/employment' });
    }

    return items.slice(0, 2);
  }, [housingAlerts, jobAlerts]);

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
            <img src="/threshold.png" alt="Threshold" className="w-8 h-8 object-contain shrink-0" />
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

        <div className={cn('px-3', isCollapsed ? 'mb-2' : 'mb-3')}>
          <NavLink
            to="/dashboard"
            onClick={() => onClose?.()}
            title={isCollapsed ? 'Dashboard' : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-xl transition-all duration-200 font-label text-sm',
                isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3',
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
                  space_dashboard
                </span>
                {!isCollapsed && <span>Dashboard</span>}
              </>
            )}
          </NavLink>
        </div>

        <div className={cn('px-3', isCollapsed ? 'mb-3' : 'mb-4')}>
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

          <NavLink
            to="/interview"
            onClick={() => onClose?.()}
            title={isCollapsed ? 'Voice Interview' : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-xl transition-all duration-200 font-label text-sm mt-2',
                isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3',
                isActive
                  ? 'bg-tertiary text-on-tertiary font-bold shadow-md'
                  : 'bg-tertiary-container text-on-tertiary-container font-semibold hover:bg-tertiary hover:text-on-tertiary'
              )
            }
          >
            <span
              className="material-symbols-outlined text-xl shrink-0"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}
            >
              mic
            </span>
            {!isCollapsed && <span>Voice Interview</span>}
          </NavLink>
        </div>

        {!isCollapsed && <div className="mx-6 border-t border-outline-variant/15" />}

        <div className={cn('flex-1', isCollapsed ? 'px-3 pt-3' : 'px-3 pt-4')}>
          {!isCollapsed && (
            <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-outline">
              Progress
            </p>
          )}
          <div className="space-y-1">
            {progressItems.map((item) => {
              const value = progress[item.key];
              const stageLabel = item.stageLabelKey ? progress[item.stageLabelKey] : undefined;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    onClose?.();
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'w-full rounded-xl transition-all duration-200 group',
                    isCollapsed
                      ? 'flex items-center justify-center px-0 py-3 hover:bg-surface-container-lowest/60'
                      : 'flex items-center gap-3 px-3 py-3 hover:bg-surface-container-lowest/60 text-left'
                  )}
                >
                  <span className="material-symbols-outlined text-xl text-on-surface-variant group-hover:text-primary transition-colors shrink-0">
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-label text-on-surface">{item.label}</span>
                          <span className="text-xs font-bold text-on-surface-variant">{value}%</span>
                        </div>
                        <ProgressBar value={value} stageLabel={stageLabel} />
                      </div>
                      <span className="material-symbols-outlined text-base text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                        chevron_right
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Alert nudges */}
          {!isCollapsed && alertNudges.length > 0 && (
            <div className="mx-3 mt-3 rounded-lg bg-surface-container p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Action needed</p>
              {alertNudges.map((nudge, i) => (
                <button
                  key={i}
                  onClick={() => { navigate(nudge.path); onClose?.(); }}
                  className="flex items-center gap-2 w-full text-left group/nudge"
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', nudge.color)} />
                  <span className="text-xs text-on-surface-variant group-hover/nudge:text-on-surface transition-colors truncate">
                    {nudge.text}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User profile + settings */}
        <div className={cn('mt-6', isCollapsed ? 'px-3' : 'px-6')}>
          <div
            className={cn(
              'pt-4 border-t border-outline-variant/20',
              isCollapsed ? 'flex flex-col items-center gap-3' : 'flex items-center gap-3'
            )}
            title={isCollapsed ? profile.personal.name : undefined}
          >
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-sm font-bold text-on-primary-fixed">
              {(profile.personal.name || '?')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-on-surface">{profile.personal.name || (isLoading ? 'Loading...' : 'Guest')}</div>
                <div className="text-[10px] uppercase text-on-surface-variant tracking-widest">Member</div>
              </div>
            )}
            <button
              onClick={() => {
                navigate('/settings');
                onClose?.();
              }}
              title="Settings"
              className="p-1.5 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest transition-colors"
            >
              <span className="material-symbols-outlined text-xl">settings</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
