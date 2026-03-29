import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBenefitsStore } from '@/store/benefitsStore';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import type { BenefitInfo, BenefitStatus } from '@/types';

const STATUS_BADGE: Record<BenefitStatus, { variant: 'active' | 'pending' | 'default'; label: string }> = {
  enrolled: { variant: 'active', label: 'Enrolled' },
  applied: { variant: 'pending', label: 'Applied' },
  not_started: { variant: 'default', label: 'Not Started' },
};

function getIconBg(status: BenefitStatus): string {
  switch (status) {
    case 'enrolled':
      return 'bg-primary/10 text-primary';
    case 'applied':
      return 'bg-secondary/10 text-secondary';
    default:
      return 'bg-surface-container-high text-on-surface-variant';
  }
}

function BenefitCard({ benefit, onCheck }: { benefit: BenefitInfo; onCheck: () => void }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_16px_rgba(26,28,28,0.06)] hover:shadow-[0_8px_24px_rgba(26,28,28,0.10)] transition-shadow flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${getIconBg(benefit.status)}`}>
          <span
            className="material-symbols-outlined text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {benefit.icon}
          </span>
        </div>
        <Badge variant={STATUS_BADGE[benefit.status].variant}>
          {STATUS_BADGE[benefit.status].label}
        </Badge>
      </div>

      {/* Title & description */}
      <div>
        <h3 className="text-xl font-headline font-bold text-on-surface">{benefit.name}</h3>
        <p className="text-sm text-on-surface-variant mt-0.5 leading-relaxed">
          {benefit.description}
        </p>
      </div>

      {/* CTA */}
      <div className="mt-auto pt-2">
        <Button variant="primary" size="sm" onClick={onCheck}>
          <span className="material-symbols-outlined text-base">chat</span>
          {benefit.status === 'enrolled' ? 'Review Eligibility' : 'Check Eligibility'}
        </Button>
      </div>
    </div>
  );
}

export function BenefitsPage() {
  const { benefits, loading, fetchBenefits } = useBenefitsStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBenefits();
  }, [fetchBenefits]);

  const enrolledCount = benefits.filter((b) => b.status === 'enrolled').length;

  return (
    <div className="px-8 md:px-12 py-10 space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
            Benefits &amp; Assistance
          </h2>
          <p className="text-on-surface-variant text-base max-w-2xl">
            Connecticut benefits eligibility screening. Check your eligibility for SNAP, Medicaid, and Medicare Savings Programs.
          </p>
        </div>

        <div className="bg-primary text-on-primary rounded-xl px-6 py-4 flex-shrink-0 flex flex-col items-center shadow-[0_4px_16px_rgba(0,101,101,0.2)]">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">
            Enrolled
          </p>
          <p className="text-3xl font-headline font-extrabold">
            {loading ? '—' : `${enrolledCount} / ${benefits.length}`}
          </p>
          <p className="text-[11px] opacity-70 mt-0.5">programs</p>
        </div>
      </section>

      {/* Program cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {benefits.map((benefit) => (
          <BenefitCard
            key={benefit.id}
            benefit={benefit}
            onCheck={() =>
              navigate('/chat?prompt=' + encodeURIComponent(benefit.chatPrefill))
            }
          />
        ))}
      </div>

      {/* Info callout */}
      <div className="bg-surface-container-low rounded-xl p-6 flex items-start gap-4">
        <span className="material-symbols-outlined text-primary text-[24px] mt-0.5 flex-shrink-0">
          info
        </span>
        <div>
          <p className="text-sm font-bold text-on-surface">How eligibility checks work</p>
          <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
            Eligibility screenings use your profile information and 2026 Connecticut income guidelines.
            Click "Check Eligibility" to start a chat with Threshold, which will walk you through the
            screening and estimate your benefits. Results are informational — not a guarantee of enrollment.
          </p>
        </div>
      </div>
    </div>
  );
}
