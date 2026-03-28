import { useEffect } from 'react';
import { useHousingStore } from '@/store/housingStore';
import { useProfileStore } from '@/store/profileStore';
import { useHousingWorkflowStore } from '@/store/housingWorkflowStore';
import { postInitHousingWorkflow } from '@/lib/api/housing';
import type { HousingQuestionnaireInput } from '@/types/housing';
import { HousingQuestionnaire } from '@/components/housing/HousingQuestionnaire';
import { SubagentProgress } from '@/components/housing/SubagentProgress';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';

export function HousingPage() {
  const { voucher, shelter, moveInChecklist } = useHousingStore();
  const profile = useProfileStore((state) => state.profile);

  const {
    isFirstTime,
    isSubmitting,
    error,
    subagentProgress,
    results,
    resultSource,
    initializeFromProfile,
    setQuestionnaire,
    startWorkflow,
    applyInitResponse,
    setError,
  } = useHousingWorkflowStore();

  useEffect(() => {
    initializeFromProfile(profile.situation.housing_status);
  }, [initializeFromProfile, profile.situation.housing_status]);

  const handleQuestionnaireSubmit = async (payload: HousingQuestionnaireInput) => {
    setQuestionnaire(payload);
    startWorkflow();

    try {
      const response = await postInitHousingWorkflow(payload);
      applyInitResponse(response);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to start housing workflow.';
      setError(message);
    }
  };

  if (isFirstTime) {
    return (
      <div className="px-8 md:px-12 py-10 space-y-8 max-w-4xl mx-auto">
        <section className="space-y-2">
          <span className="text-primary font-bold tracking-widest text-xs uppercase">Housing Onboarding</span>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
            Start Housing Workflow
          </h2>
          <p className="text-on-surface-variant text-base max-w-2xl leading-relaxed">
            Complete intake once so subagents can qualify your options, search listings, and prep applications.
          </p>
        </section>

        <HousingQuestionnaire
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleQuestionnaireSubmit}
        />
      </div>
    );
  }

  const completedItems = moveInChecklist.filter((i) => i.done).length;
  const totalItems = moveInChecklist.length;
  const checklistPercent = Math.round((completedItems / totalItems) * 100);

  const voucherBadgeVariant = voucher.status === 'active' ? 'active' : voucher.status === 'pending' ? 'pending' : 'error';

  const caseManagerMatch = shelter.notes.match(/Case manager:\s*(.+)$/i);
  const caseManagerName = caseManagerMatch ? caseManagerMatch[1].trim() : 'David Rodriguez';

  return (
    <div className="px-8 md:px-12 py-10 space-y-10 max-w-7xl mx-auto">
      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-primary font-bold tracking-widest text-xs uppercase">
            Stability Roadmap
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
            Housing Stabilization
          </h2>
          <Badge variant={voucherBadgeVariant} className="mt-1">
            {voucher.status === 'active' ? 'Voucher Active' : voucher.status === 'pending' ? 'Pending Review' : 'Action Needed'}
          </Badge>
        </div>
        <p className="text-on-surface-variant text-base max-w-2xl leading-relaxed">
          Securing a permanent residence is the cornerstone of successful reentry. We&apos;re
          tracking your voucher status and searching within your preferred radius.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-xl p-7 shadow-[0_4px_16px_rgba(26,28,28,0.06)]">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">
                Housing Voucher
              </h3>
              <p className="text-sm text-on-surface-variant mt-0.5">{voucher.type}</p>
            </div>
            <Badge variant={voucherBadgeVariant}>
              {voucher.status === 'active' ? 'Active' : voucher.status}
            </Badge>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-on-surface">Application Maturity</span>
              <span className="font-bold text-primary">{voucher.progressPercent}%</span>
            </div>
            <ProgressBar value={voucher.progressPercent} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-low rounded-xl p-4">
              <span className="material-symbols-outlined text-primary mb-1 block">
                hourglass_top
              </span>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                Waitlist Rank
              </p>
              <p className="font-bold text-on-surface text-sm mt-0.5">#{voucher.waitlistRank}</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4">
              <span className="material-symbols-outlined text-primary mb-1 block">event</span>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                Est. Date
              </p>
              <p className="font-bold text-on-surface text-sm mt-0.5">{voucher.estimatedDate}</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4">
              <span className="material-symbols-outlined text-primary mb-1 block">
                calendar_today
              </span>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                Expires
              </p>
              <p className="font-bold text-on-surface text-sm mt-0.5">
                {new Date(voucher.expiryDate).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-primary text-on-primary rounded-xl p-7 shadow-[0_4px_16px_rgba(26,28,28,0.10)] flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-headline font-bold mb-1">Current Shelter</h3>
            <div className="flex items-center gap-1.5 text-on-primary/80 mb-6">
              <span className="material-symbols-outlined text-sm">location_on</span>
              <span className="text-sm font-medium">{shelter.name}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-on-primary/60 text-[18px] mt-0.5">
                  home_pin
                </span>
                <div>
                  <p className="text-xs font-bold text-on-primary/60 uppercase tracking-wide">
                    Address
                  </p>
                  <p className="text-sm font-medium">{shelter.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-on-primary/60 text-[18px] mt-0.5">
                  phone
                </span>
                <div>
                  <p className="text-xs font-bold text-on-primary/60 uppercase tracking-wide">
                    Phone
                  </p>
                  <p className="text-sm font-medium">{shelter.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-on-primary/60 text-[18px] mt-0.5">
                  login
                </span>
                <div>
                  <p className="text-xs font-bold text-on-primary/60 uppercase tracking-wide">
                    Check-in Date
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(shelter.checkInDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-on-primary/60 text-[18px] mt-0.5">
                  person
                </span>
                <div>
                  <p className="text-xs font-bold text-on-primary/60 uppercase tracking-wide">
                    Case Manager
                  </p>
                  <p className="text-sm font-medium">{caseManagerName}</p>
                </div>
              </div>
            </div>
          </div>

          <button className="mt-6 w-full py-2.5 px-4 bg-white/15 hover:bg-white/25 transition-colors rounded-xl text-sm font-bold border border-white/20 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
            Contact Shelter
          </button>
        </div>
      </div>

      <div className="bg-surface-container-high rounded-xl h-48 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl opacity-40">location_on</span>
        <p className="text-sm font-medium opacity-60">Housing Search Area</p>
        <p className="text-xs opacity-40">Map integration coming soon</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-7 shadow-[0_4px_16px_rgba(26,28,28,0.06)]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-headline font-bold text-on-surface">Move-In Readiness</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {completedItems} of {totalItems} complete
            </p>
          </div>
          <span className="text-sm font-bold text-primary">{checklistPercent}%</span>
        </div>

        <ProgressBar value={checklistPercent} className="mb-8" />

        <div className="space-y-5">
          {moveInChecklist.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <span
                className={`material-symbols-outlined text-xl flex-shrink-0 ${
                  item.done ? 'text-primary' : 'text-on-surface-variant opacity-40'
                }`}
                style={item.done ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.done ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span
                className={`text-sm font-medium ${
                  item.done ? 'text-on-surface' : 'text-on-surface-variant'
                }`}
              >
                {item.item}
              </span>
              {item.done && (
                <span className="ml-auto text-[10px] font-bold text-primary uppercase tracking-wide">
                  Done
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-tertiary-fixed rounded-xl flex gap-3 items-start">
          <span className="material-symbols-outlined text-tertiary flex-shrink-0">sticky_note_2</span>
          <div>
            <p className="text-sm font-bold text-on-tertiary-fixed">Counselor Note</p>
            <p className="text-xs text-on-tertiary-fixed-variant leading-relaxed mt-0.5">
              "Spoke with Oakwood management - they are friendly to reentry applicants. Let&apos;s
              finish the deposit application by Friday." - Sarah
            </p>
          </div>
        </div>
      </div>

      <SubagentProgress progress={subagentProgress} results={results} source={resultSource} />
    </div>
  );
}
