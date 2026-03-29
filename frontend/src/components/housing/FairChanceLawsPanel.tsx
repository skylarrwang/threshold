import { useState } from 'react';
import type { FairChanceLaw } from '@/types';

interface FairChanceLawsPanelProps {
  law: FairChanceLaw | null;
  loading: boolean;
}

export function FairChanceLawsPanel({ law, loading }: FairChanceLawsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-surface-container-high rounded w-48 mb-3" />
        <div className="h-3 bg-surface-container-high rounded w-full mb-2" />
        <div className="h-3 bg-surface-container-high rounded w-3/4" />
      </div>
    );
  }

  if (!law) return null;

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_rgba(26,28,28,0.04)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-xl text-primary">gavel</span>
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              Fair Chance Housing Laws \u2014 {law.state}
            </h3>
            <p className="text-xs text-on-surface-variant">
              {law.has_law ? `Scope: ${law.scope}` : 'Federal protections apply'}
            </p>
          </div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant transition-transform">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm text-on-surface leading-relaxed">{law.summary}</p>

          {law.resource && (
            <a
              href={law.resource}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Learn more
            </a>
          )}

          {/* Federal baseline always shown */}
          <div className="mt-3 pt-3 border-t border-outline-variant/15">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant mb-2">
              Federal Protections (Apply Everywhere)
            </p>
            <ul className="text-xs text-on-surface-variant space-y-1.5 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-primary flex-shrink-0">&bull;</span>
                HUD guidance (2016): blanket bans on criminal history may violate the Fair Housing Act
              </li>
              <li className="flex gap-2">
                <span className="text-primary flex-shrink-0">&bull;</span>
                Only 2 automatic federal bars: lifetime sex offender registrants and meth production on federal premises
              </li>
              <li className="flex gap-2">
                <span className="text-primary flex-shrink-0">&bull;</span>
                PHAs must do individualized assessments &mdash; blanket bans are not allowed
              </li>
              <li className="flex gap-2">
                <span className="text-primary flex-shrink-0">&bull;</span>
                You have the right to appeal any denial within 14 days
              </li>
            </ul>
          </div>

          <p className="text-[10px] text-on-surface-variant/60 italic mt-2">
            This is general information, not legal advice. Laws change &mdash; verify with a housing
            attorney or legal aid: lawhelp.org
          </p>
        </div>
      )}
    </div>
  );
}
