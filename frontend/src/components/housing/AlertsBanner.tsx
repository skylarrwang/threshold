import type { HousingAlerts } from '@/types';

interface AlertsBannerProps {
  alerts: HousingAlerts;
}

export function AlertsBanner({ alerts }: AlertsBannerProps) {
  const hasOverdue = alerts.overdue.length > 0;
  const hasUpcoming = alerts.upcoming_7_days.length > 0;
  const hasInterviews = alerts.interviews_upcoming.length > 0;
  const hasDeadlines = alerts.deadlines_soon.length > 0;

  if (!hasOverdue && !hasUpcoming && !hasInterviews && !hasDeadlines) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Overdue follow-ups — red/urgent */}
      {hasOverdue && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h4 className="text-sm font-bold text-red-800 mb-2">
            Overdue Follow-ups
          </h4>
          <ul className="space-y-1.5">
            {alerts.overdue.map((a) => (
              <li key={a.program} className="text-sm text-red-700">
                <span className="font-medium">{a.program}</span>
                {' — '}follow-up was due {a.follow_up_date} ({a.days_overdue} days overdue)
                {a.contact_phone && (
                  <span className="text-red-600"> · Call {a.contact_phone}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Approaching deadlines — red/urgent */}
      {hasDeadlines && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h4 className="text-sm font-bold text-red-800 mb-2">
            Approaching Deadlines
          </h4>
          <ul className="space-y-1.5">
            {alerts.deadlines_soon.map((a) => (
              <li key={a.program} className="text-sm text-red-700">
                <span className="font-medium">{a.program}</span>
                {' — '}{a.deadline}
                {a.days_left !== undefined && (
                  a.days_left < 0
                    ? <span className="font-bold"> PAST DUE</span>
                    : <span> ({a.days_left} days left)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upcoming follow-ups — amber/warning */}
      {hasUpcoming && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="text-sm font-bold text-amber-800 mb-2">
            Follow-ups This Week
          </h4>
          <ul className="space-y-1.5">
            {alerts.upcoming_7_days.map((a) => (
              <li key={a.program} className="text-sm text-amber-700">
                <span className="font-medium">{a.program}</span>
                {' — '}due {a.follow_up_date}
                {a.status && <span className="text-amber-600"> · {a.status}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upcoming interviews — blue/info */}
      {hasInterviews && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-bold text-blue-800 mb-2">
            Upcoming Interviews
          </h4>
          <ul className="space-y-1.5">
            {alerts.interviews_upcoming.map((a) => (
              <li key={a.program} className="text-sm text-blue-700">
                <span className="font-medium">{a.program}</span>
                {' — '}{a.interview_date}
                {a.interview_time && <span> at {a.interview_time}</span>}
                {a.interview_location && <span> · {a.interview_location}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
