import { Badge } from '@/components/shared/Badge';
import type { HousingApplication } from '@/types';

const STATUS_BADGE_VARIANT: Record<string, 'active' | 'pending' | 'action' | 'error' | 'done' | 'default'> = {
  discovered: 'default',
  contacted: 'default',
  documents_gathering: 'pending',
  applied: 'active',
  screening: 'pending',
  waitlisted: 'pending',
  voucher_issued: 'action',
  unit_search: 'action',
  interview_scheduled: 'action',
  approved: 'done',
  lease_review: 'action',
  moved_in: 'done',
  denied: 'error',
  appeal_filed: 'action',
};

interface ApplicationCardProps {
  application: HousingApplication;
  onUpdateStatus?: (id: string) => void;
  onEdit?: (app: HousingApplication) => void;
  onDelete?: (id: string) => void;
}

export function ApplicationCard({ application: app, onUpdateStatus, onEdit, onDelete }: ApplicationCardProps) {
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
        <div className="flex items-center gap-2">
          {onUpdateStatus && (
            <button
              onClick={() => onUpdateStatus(app.id)}
              className="text-[10px] font-bold text-primary uppercase tracking-wide hover:underline"
            >
              Update
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(app)}
              className="p-1 hover:bg-surface-container-high rounded-lg transition-colors"
              title="Edit application"
            >
              <span className="material-symbols-outlined text-sm text-on-surface-variant">edit</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm(`Delete "${app.program}"?`)) onDelete(app.id);
              }}
              className="p-1 hover:bg-error/10 rounded-lg transition-colors"
              title="Delete application"
            >
              <span className="material-symbols-outlined text-sm text-error">delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
