import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHousingStore } from '@/store/housingStore';
import { useProfileStore } from '@/store/profileStore';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { PipelineStepper } from '@/components/housing/PipelineStepper';
import { ApplicationList } from '@/components/housing/ApplicationList';
import { LogApplicationModal } from '@/components/housing/LogApplicationModal';
import { QuickActionsGrid } from '@/components/housing/QuickActionsGrid';
import { FairChanceLawsPanel } from '@/components/housing/FairChanceLawsPanel';
import { ReadinessChecklist } from '@/components/housing/ReadinessChecklist';
import { AlertsBanner } from '@/components/housing/AlertsBanner';

const HOUSING_STATUS_LABELS: Record<string, string> = {
  housed: 'Housed',
  shelter: 'In Shelter',
  couch_surfing: 'Couch Surfing',
  unhoused: 'Unhoused',
  unknown: 'Status Unknown',
};

const HOUSING_STATUS_BADGE: Record<string, 'active' | 'pending' | 'action' | 'error' | 'default'> = {
  housed: 'active',
  shelter: 'pending',
  couch_surfing: 'action',
  unhoused: 'error',
  unknown: 'default',
};

export function HousingPage() {
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const {
    pipeline,
    pipelineLoading,
    alerts,
    fairChanceLaw,
    fairChanceLawLoading,
    fetchPipeline,
    fetchAlerts,
    fetchFairChanceLaw,
    setLogModalOpen,
  } = useHousingStore();

  // Fetch data on mount
  useEffect(() => {
    fetchPipeline();
    fetchAlerts();
  }, [fetchPipeline, fetchAlerts]);

  useEffect(() => {
    const state = profile.personal.home_state || 'CT';
    fetchFairChanceLaw(state);
  }, [profile.personal.home_state, fetchFairChanceLaw]);

  const applications = pipeline?.applications || [];
  const activeCount = pipeline?.active_count || 0;
  const approvedCount = pipeline?.approved_count || 0;
  const nextFollowUp = pipeline?.next_follow_up;
  const housingStatus = profile.situation.housing_status || 'unknown';

  // Build readiness checklist from profile data
  const checklistItems = [
    {
      id: 'id',
      label: 'Government photo ID obtained',
      done: false, // Would check documents store
    },
    {
      id: 'ssn',
      label: 'Social Security card obtained',
      done: false,
    },
    {
      id: 'income',
      label: 'Income source established (job or benefits)',
      done: profile.situation.employment_status !== 'unemployed',
    },
    {
      id: 'applications',
      label: 'At least 3 housing applications submitted',
      done: applications.filter((a) => ['applied', 'screening', 'waitlisted', 'voucher_issued', 'unit_search', 'interview_scheduled', 'approved', 'lease_review', 'moved_in'].includes(a.status)).length >= 3,
    },
    {
      id: 'rights',
      label: 'Reviewed fair chance housing rights',
      done: fairChanceLaw !== null,
    },
  ];

  return (
    <div className="px-6 md:px-12 py-8 space-y-8 max-w-7xl mx-auto">
      {/* Log Application Modal */}
      <LogApplicationModal />

      {/* ─── Section 1: Header + Summary ─── */}
      <section className="space-y-2">
        <span className="text-primary font-bold tracking-widest text-xs uppercase">
          Stability Roadmap
        </span>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-surface">
            Housing Stabilization
          </h2>
          <Badge variant={HOUSING_STATUS_BADGE[housingStatus] || 'default'}>
            {HOUSING_STATUS_LABELS[housingStatus] || housingStatus}
          </Badge>
        </div>
        <p className="text-on-surface-variant text-sm max-w-2xl leading-relaxed">
          Track your housing search, prepare applications, and know your rights.
          Everything here works with your housing navigator in the chat.
        </p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-4 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-lg text-primary">description</span>
            <span className="font-bold text-on-surface">{activeCount}</span>
            <span className="text-on-surface-variant">active applications</span>
          </div>
          {approvedCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
              <span className="font-bold text-on-surface">{approvedCount}</span>
              <span className="text-on-surface-variant">approved</span>
            </div>
          )}
          {nextFollowUp && (
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-lg text-tertiary">event</span>
              <span className="text-on-surface-variant">
                Next follow-up: <span className="font-bold text-on-surface">{nextFollowUp.date}</span> ({nextFollowUp.program})
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ─── Alerts Banner ─── */}
      {alerts && <AlertsBanner alerts={alerts} />}

      {/* ─── Section 2: Pipeline Tracker ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-headline font-bold text-on-surface">Application Pipeline</h3>
          <Button size="sm" onClick={() => setLogModalOpen(true)}>
            <span className="material-symbols-outlined text-base">add</span>
            Log Application
          </Button>
        </div>

        {pipelineLoading ? (
          <div className="bg-surface-container-lowest rounded-xl p-8 animate-pulse">
            <div className="h-10 bg-surface-container-high rounded w-full mb-4" />
            <div className="h-24 bg-surface-container-high rounded w-full" />
          </div>
        ) : applications.length > 0 ? (
          <div className="space-y-5">
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_2px_8px_rgba(26,28,28,0.04)]">
              <PipelineStepper applications={applications} />
            </div>
            <ApplicationList applications={applications} />
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl p-8 text-center shadow-[0_2px_8px_rgba(26,28,28,0.04)]">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3 block">
              home_work
            </span>
            <p className="text-sm font-medium text-on-surface-variant mb-1">
              No housing applications tracked yet
            </p>
            <p className="text-xs text-on-surface-variant/60 mb-4 max-w-md mx-auto">
              Start a housing search with your navigator, or log an application manually.
              Apply to at least 3 programs in parallel for the best chance.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setLogModalOpen(true)}
              >
                <span className="material-symbols-outlined text-base">add</span>
                Log Manually
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/chat?prompt=' + encodeURIComponent('Help me find housing programs near Hartford, CT'))}
              >
                <span className="material-symbols-outlined text-base">support_agent</span>
                Start Housing Search
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ─── Section 3: Quick Actions ─── */}
      <section className="space-y-3">
        <h3 className="text-lg font-headline font-bold text-on-surface">Housing Tools</h3>
        <p className="text-xs text-on-surface-variant">
          Each tool opens a conversation with your housing navigator
        </p>
        <QuickActionsGrid />
      </section>

      {/* ─── Section 4: Fair Chance Laws ─── */}
      <section>
        <FairChanceLawsPanel law={fairChanceLaw} loading={fairChanceLawLoading} />
      </section>

      {/* ─── Section 5: Move-In Readiness ─── */}
      <section>
        <ReadinessChecklist items={checklistItems} />
      </section>
    </div>
  );
}
