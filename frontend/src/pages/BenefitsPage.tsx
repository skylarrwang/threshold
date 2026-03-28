import { useBenefitsStore } from '@/store/benefitsStore';
import { Badge } from '@/components/shared/Badge';
import type { BenefitApplication, BenefitStatus } from '@/types';

const BENEFIT_BADGE: Record<BenefitStatus, { variant: 'active' | 'pending' | 'action' | 'error'; label: string }> = {
  active: { variant: 'active', label: 'Active' },
  pending: { variant: 'pending', label: 'Pending' },
  action_needed: { variant: 'action', label: 'Action Needed' },
  expired: { variant: 'error', label: 'Expired' },
};

function getIconBgClasses(status: BenefitStatus): string {
  switch (status) {
    case 'active':
      return 'bg-primary/10 text-primary';
    case 'pending':
      return 'bg-secondary/10 text-secondary';
    case 'action_needed':
      return 'bg-tertiary-fixed text-tertiary';
    case 'expired':
      return 'bg-error-container text-on-error-container';
    default:
      return 'bg-surface-container text-on-surface-variant';
  }
}

function BenefitCard({ benefit }: { benefit: BenefitApplication }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_16px_rgba(26,28,28,0.06)] hover:shadow-[0_8px_24px_rgba(26,28,28,0.10)] transition-shadow flex flex-col gap-4">
      {/* Header: icon + badge */}
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${getIconBgClasses(benefit.status)}`}>
          <span
            className="material-symbols-outlined text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {benefit.icon}
          </span>
        </div>
        <Badge variant={BENEFIT_BADGE[benefit.status].variant}>
          {BENEFIT_BADGE[benefit.status].label}
        </Badge>
      </div>

      {/* Title & description */}
      <div>
        <h3 className="text-xl font-headline font-bold text-on-surface">{benefit.name}</h3>
        <p className="text-sm text-on-surface-variant mt-0.5 leading-relaxed">
          {benefit.description}
        </p>
      </div>

      {/* Monthly amount */}
      {benefit.monthlyAmount !== undefined && (
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-headline font-extrabold text-primary">
            ${benefit.monthlyAmount}
          </span>
          <span className="text-xs text-on-surface-variant font-medium">/month</span>
        </div>
      )}

      {/* Next review date */}
      {benefit.nextReviewDate && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]">event</span>
          <span>
            Next review:{' '}
            {new Date(benefit.nextReviewDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      )}

      {/* Next steps */}
      {benefit.nextSteps && benefit.nextSteps.length > 0 && (
        <ul className="space-y-1.5 mt-auto">
          {benefit.nextSteps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0 text-primary">
                arrow_right
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Simple 3-month timeline bar for the impact overview
function TimelineBar() {
  const months = ['October', 'November', 'December'];
  return (
    <div className="flex gap-2 mt-4">
      {months.map((month, idx) => (
        <div key={month} className="flex-1">
          <div
            className={`h-3 rounded-full ${
              idx === 0
                ? 'bg-primary'
                : idx === 1
                ? 'bg-primary/50'
                : 'bg-surface-container-high'
            }`}
          />
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">{month}</p>
        </div>
      ))}
    </div>
  );
}

export function BenefitsPage() {
  const { benefits, totalMonthly } = useBenefitsStore();

  return (
    <div className="px-8 md:px-12 py-10 space-y-10 max-w-7xl mx-auto">
      {/* Page header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
            Benefits &amp; Assistance
          </h2>
          <p className="text-on-surface-variant text-base max-w-2xl">
            Tracking your progress toward essential social services. Your journey to stability is
            supported every step of the way.
          </p>
        </div>

        {/* Total monthly summary card */}
        <div className="bg-primary text-on-primary rounded-xl px-6 py-4 flex-shrink-0 flex flex-col items-center shadow-[0_4px_16px_rgba(0,101,101,0.2)]">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">
            Total Monthly
          </p>
          <p className="text-3xl font-headline font-extrabold">${totalMonthly}</p>
          <p className="text-[11px] opacity-70 mt-0.5">estimated support</p>
        </div>
      </section>

      {/* Benefit cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {benefits.map((benefit) => (
          <BenefitCard key={benefit.id} benefit={benefit} />
        ))}
      </div>

      {/* Benefit impact overview card */}
      <div className="bg-surface-container-low rounded-xl p-8 space-y-6">
        <h3 className="text-xl font-headline font-bold text-on-surface">
          Benefit Impact Overview
        </h3>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left: financial stats */}
          <div className="flex-1 space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-1 bg-primary self-stretch rounded-full flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-on-surface">Estimated Monthly Support</p>
                <p className="text-4xl font-headline font-extrabold text-primary mt-1">
                  ${totalMonthly}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Based on active and pending benefits
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-1 bg-secondary self-stretch rounded-full flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-on-surface">Eligibility Timeline</p>
                <p className="text-xl font-headline font-bold text-on-surface mt-0.5">
                  12 Days Remaining
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Next interview: November 5th at 10:00 AM
                </p>
              </div>
            </div>
          </div>

          {/* Right: timeline visual */}
          <div className="w-full md:w-72 bg-surface-container-lowest rounded-xl p-6 shadow-[0_4px_16px_rgba(26,28,28,0.06)]">
            <p className="text-sm font-bold text-on-surface mb-1">3-Month Outlook</p>
            <p className="text-xs text-on-surface-variant">
              Support coverage projections
            </p>
            <TimelineBar />
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  event_upcoming
                </span>
                <p className="text-xs font-bold text-on-surface">Next Interview Highlight</p>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Medicaid eligibility interview — Nov 5th, 10:00 AM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
