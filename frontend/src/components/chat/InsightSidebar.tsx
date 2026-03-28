import { useProfileStore } from '@/store/profileStore';
import { Avatar } from '@/components/shared/Avatar';
import { StatusDot } from '@/components/shared/StatusDot';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  label: string;
  done: boolean;
}

const CHECKLIST: ChecklistItem[] = [
  { label: 'State ID obtained', done: true },
  { label: 'SNAP enrolled', done: true },
  { label: 'Ready-to-Work certification', done: false },
  { label: 'Permanent housing secured', done: false },
];

interface RelatedFile {
  name: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

const RELATED_FILES: RelatedFile[] = [
  {
    name: 'Resume (Draft)',
    subtitle: 'Updated 2 days ago',
    icon: 'description',
    iconBg: 'bg-secondary-fixed',
    iconColor: 'text-secondary',
  },
  {
    name: 'Housing Application',
    subtitle: 'Submitted Oct 19',
    icon: 'folder',
    iconBg: 'bg-tertiary-fixed',
    iconColor: 'text-on-tertiary-fixed-variant',
  },
];

export function InsightSidebar() {
  const { profile } = useProfileStore();
  const currentGoal = profile.goals.short_term_goals[0] ?? 'Find stable housing';

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar bg-surface-container-lowest/60 backdrop-blur-sm">
      <div className="p-5 space-y-6">

        {/* Counselor card */}
        <div>
          <div className="flex items-center gap-2 text-tertiary mb-3">
            <span
              className="material-symbols-outlined p-1.5 bg-tertiary/10 rounded-lg text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              tips_and_updates
            </span>
            <h4 className="font-headline font-extrabold text-sm tracking-tight">Counselor's Insight</h4>
          </div>

          <div className="p-4 bg-tertiary-fixed rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name="Diana" size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-tertiary-fixed truncate">Diana</p>
                <p className="text-[11px] text-on-tertiary-fixed-variant font-medium">Lead Counselor</p>
              </div>
              <StatusDot online={true} pulse={true} />
            </div>
            <p className="text-[11px] text-on-tertiary-fixed leading-relaxed font-medium">
              Available and ready to help you with your next steps.
            </p>
          </div>
        </div>

        {/* Current goal */}
        <div>
          <h5 className="text-[11px] font-bold text-outline uppercase tracking-widest mb-3 pl-0.5">Current Goal</h5>
          <div className="p-3.5 bg-surface-container-lowest rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-base">flag</span>
              <p className="text-xs font-bold text-on-surface">{currentGoal}</p>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed pl-6">
              Stay focused — you're making real progress.
            </p>
          </div>
        </div>

        {/* Next steps checklist */}
        <div>
          <h5 className="text-[11px] font-bold text-outline uppercase tracking-widest mb-3 pl-0.5">Next Steps</h5>
          <div className="space-y-2">
            {CHECKLIST.map((item) => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer shadow-sm',
                  item.done
                    ? 'bg-primary/5'
                    : 'bg-surface-container-lowest hover:bg-surface-container-low'
                )}
              >
                <span
                  className={cn(
                    'material-symbols-outlined text-xl flex-shrink-0',
                    item.done ? 'text-primary' : 'text-outline'
                  )}
                  style={item.done ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.done ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <p className={cn('text-xs font-semibold', item.done ? 'text-on-surface-variant line-through' : 'text-on-surface')}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Related files */}
        <div>
          <h5 className="text-[11px] font-bold text-outline uppercase tracking-widest mb-3 pl-0.5">Related Files</h5>
          <div className="space-y-2">
            {RELATED_FILES.map((file) => (
              <button
                key={file.name}
                className="group w-full flex items-center gap-3 p-3 bg-surface-container-lowest hover:bg-surface-container-high rounded-xl transition-all cursor-pointer shadow-sm text-left"
              >
                <div className={cn('w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0', file.iconBg)}>
                  <span
                    className={cn('material-symbols-outlined text-lg', file.iconColor)}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {file.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{file.name}</p>
                  <p className="text-[10px] text-outline font-medium">{file.subtitle}</p>
                </div>
                <span className="material-symbols-outlined text-outline text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  open_in_new
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
