import type {
  HousingSubagentPhaseProgress,
  HousingWorkflowPhase,
  HousingWorkflowResults,
} from '@/types/housing';

interface SubagentProgressProps {
  progress: Record<HousingWorkflowPhase, HousingSubagentPhaseProgress>;
  results: HousingWorkflowResults;
  source: 'mock' | 'live' | null;
}

const orderedPhases: HousingWorkflowPhase[] = ['qualifications', 'search', 'applications'];

const phaseTitles: Record<HousingWorkflowPhase, string> = {
  qualifications: 'Eligibility & Qualification',
  search: 'Listing Search',
  applications: 'Application Prep',
};

function getStatusLabel(status: HousingSubagentPhaseProgress['status']): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'idle':
      return 'Waiting';
  }
}

function getStatusClasses(status: HousingSubagentPhaseProgress['status']): string {
  switch (status) {
    case 'running':
      return 'text-blue-700 bg-blue-100';
    case 'completed':
      return 'text-green-700 bg-green-100';
    case 'failed':
      return 'text-red-700 bg-red-100';
    case 'idle':
      return 'text-on-surface-variant bg-surface-container-high';
  }
}

export function SubagentProgress({ progress, results, source }: SubagentProgressProps) {
  const hasAnyResults =
    results.qualifications.length > 0 || results.listings.length > 0 || results.applications.length > 0;

  return (
    <section className="bg-surface-container-lowest rounded-xl p-7 shadow-[0_4px_16px_rgba(26,28,28,0.06)] space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl font-headline font-bold text-on-surface">Housing Workflow Progress</h3>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Qualification, listing search, and application subagents update in sequence.
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant">
          {source === 'live' ? 'Live Results' : source === 'mock' ? 'Mock Results' : 'No Results Yet'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orderedPhases.map((phase) => {
          const item = progress[phase];

          return (
            <div key={phase} className="rounded-lg border border-outline-variant/30 p-4 bg-surface-container-low">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-on-surface">{phaseTitles[phase]}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded ${getStatusClasses(item.status)}`}>
                  {getStatusLabel(item.status)}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {item.message ?? 'Pending subagent execution.'}
              </p>
            </div>
          );
        })}
      </div>

      {hasAnyResults && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Qualifications</p>
            {results.qualifications.length === 0 && (
              <p className="text-sm text-on-surface-variant">No qualification results yet.</p>
            )}
            <div className="space-y-2">
              {results.qualifications.map((qualification) => (
                <div key={qualification.program}>
                  <p className="text-sm font-semibold text-on-surface">{qualification.program}</p>
                  <p className="text-xs text-on-surface-variant">{qualification.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Listings</p>
            {results.listings.length === 0 && (
              <p className="text-sm text-on-surface-variant">No listings generated yet.</p>
            )}
            <div className="space-y-2">
              {results.listings.map((listing) => (
                <div key={listing.id}>
                  <p className="text-sm font-semibold text-on-surface">{listing.title}</p>
                  <p className="text-xs text-on-surface-variant">
                    ${listing.rent}/mo · {listing.bedrooms} bd · {listing.matchScore}% match
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Applications</p>
            {results.applications.length === 0 && (
              <p className="text-sm text-on-surface-variant">No application actions yet.</p>
            )}
            <div className="space-y-2">
              {results.applications.map((application) => (
                <div key={application.listingId}>
                  <p className="text-sm font-semibold text-on-surface">{application.listingTitle}</p>
                  <p className="text-xs text-on-surface-variant">Status: {application.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
