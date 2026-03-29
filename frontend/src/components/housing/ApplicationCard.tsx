import { Badge } from '@/components/shared/Badge';
import type { HousingApplication } from '@/types';

const STATUS_BADGE_VARIANT: Record<string, 'active' | 'pending' | 'action' | 'error' | 'done' | 'default'> = {
  discovered: 'default',
  documents_ready: 'pending',
  applied: 'active',
  waitlisted: 'pending',
  interview_scheduled: 'action',
  approved: 'done',
  denied: 'error',
  moved_in: 'done',
};

interface ApplicationCardProps {
  application: HousingApplication;
  onUpdateStatus?: (id: string) => void;
}

export function ApplicationCard({ application: app, onUpdateStatus }: ApplicationCardProps) {
  const badgeVariant = STATUS_BADGE_VARIANT[app.status] || 'default';

  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_2px_8px_rgba(26,28,28,0.04)] hover:shadow-[0_4px_16px_rgba(26,28,28,0.08)] transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-sm font-bold text-on-surface leading-tight">{app.program}</h4>
        <Badge variant={badgeVariant}>{app.stage_label || app.status}</Badge>
      </div>

      {(app.contact_name || app.contact_phone) && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
          <span className="material-symbols-outlined text-sm">person</span>
          <span>
            {app.contact_name}
            {app.contact_phone && ` \u2014 ${app.contact_phone}`}
          </span>
        </div>
      )}

      {app.follow_up_date && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
          <span className="material-symbols-outlined text-sm">event</span>
          <span>Follow up by {app.follow_up_date}</span>
        </div>
      )}

      {app.notes && (
        <p className="text-xs text-on-surface-variant mb-2 line-clamp-2">{app.notes}</p>
      )}

      {app.next_action && (
        <div className="mt-3 pt-3 border-t border-outline-variant/15">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-primary flex-shrink-0 mt-0.5">
              arrow_forward
            </span>
            <p className="text-xs font-medium text-primary leading-relaxed">{app.next_action}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-on-surface-variant/60">
          Updated {new Date(app.updated_at).toLocaleDateString()}
        </span>
        {onUpdateStatus && (
          <button
            onClick={() => onUpdateStatus(app.id)}
            className="text-[10px] font-bold text-primary uppercase tracking-wide hover:underline"
          >
            Update
          </button>
        )}
      </div>
    </div>
  );
}
