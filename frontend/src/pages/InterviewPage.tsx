import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostInterviewResult {
  summary: string;
  highlights: {
    goals: string[];
    strengths: string[];
    concerns: string[];
    needs_follow_up: string[];
  };
  care_plan: Array<{
    priority: string;
    action: string;
    reason: string;
    subagent: string;
  }>;
  stats: {
    fields_captured: number;
    observations_logged: number;
    needs_help_count: number;
    completion_pct: number;
  };
}

// ---------------------------------------------------------------------------
// Schema sections for the live visualization
// ---------------------------------------------------------------------------

const SCHEMA_SECTIONS: Record<string, { label: string; icon: string; fields: string[] }> = {
  identity: {
    label: 'Identity',
    icon: 'person',
    fields: ['legal_name', 'date_of_birth', 'current_address', 'phone_number', 'gender_identity', 'state_of_release', 'preferred_language'],
  },
  supervision: {
    label: 'Supervision',
    icon: 'gavel',
    fields: ['supervision_type', 'supervision_end_date', 'po_name', 'next_reporting_date', 'reporting_frequency', 'curfew_start', 'curfew_end', 'drug_testing_required', 'electronic_monitoring'],
  },
  housing: {
    label: 'Housing',
    icon: 'home',
    fields: ['housing_status', 'returning_to_housing_with', 'sex_offender_registry', 'eviction_history'],
  },
  employment: {
    label: 'Employment',
    icon: 'work',
    fields: ['employment_status', 'felony_category', 'has_valid_drivers_license', 'has_ged_or_diploma', 'trade_skills', 'certifications'],
  },
  health: {
    label: 'Health',
    icon: 'health_and_safety',
    fields: ['current_medications', 'has_active_medicaid', 'disability_status', 'chronic_conditions', 'substance_use_disorder_diagnosis', 'insurance_gap'],
  },
  benefits: {
    label: 'Benefits',
    icon: 'account_balance',
    fields: ['benefits_enrolled', 'veteran_status', 'child_support_obligations'],
  },
};

const PHASE_LABELS: Record<string, string> = {
  welcome: 'Getting Started',
  identity_situation: 'Identity & Situation',
  employment_education: 'Employment & Skills',
  health_benefits: 'Health & Benefits',
  goals_wrap_up: 'Goals & Wrap-up',
  complete: 'Complete',
};

const VOICE_SERVER_URL = 'http://localhost:7860';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function InterviewPage() {
  const navigate = useNavigate();

  const [stage, setStage] = useState<'intro' | 'active' | 'summary'>('intro');
  const [connecting, setConnecting] = useState(false);
  const [clientUrl, setClientUrl] = useState<string | null>(null);

  // Live state
  const [filledFields, setFilledFields] = useState<Record<string, Set<string>>>({});
  const [needsHelpFields] = useState<Record<string, Set<string>>>({});
  const [completionPct, setCompletionPct] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('welcome');
  const [recentObs] = useState<string[]>([]);
  const [postResult, setPostResult] = useState<PostInterviewResult | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPollingCompletion = useCallback(() => {
    const poll = async () => {
      try {
        const [completionRes, sessionRes] = await Promise.all([
          fetch('/api/profile/completion'),
          fetch('/api/voice/session/active'),
        ]);
        const completionData = await completionRes.json();
        if (completionData.overall_pct !== undefined) setCompletionPct(completionData.overall_pct);
        if (completionData.by_section) {
          const filled: Record<string, Set<string>> = {};
          for (const [section, info] of Object.entries(completionData.by_section) as any) {
            const allFields = SCHEMA_SECTIONS[section]?.fields || [];
            const missing = new Set(info.missing || []);
            const sectionFilled = new Set<string>();
            for (const f of allFields) {
              if (!missing.has(f)) sectionFilled.add(f);
            }
            if (sectionFilled.size > 0) filled[section] = sectionFilled;
          }
          setFilledFields(filled);
        }
        const sessionData = await sessionRes.json();
        if (sessionData.ok && sessionData.current_phase) {
          setCurrentPhase(sessionData.current_phase);
        }
      } catch { /* ignore */ }
    };
    poll();
    pollingRef.current = setInterval(poll, 3000);
  }, []);

  const startInterview = useCallback(async () => {
    setConnecting(true);
    try {
      const res = await fetch(`${VOICE_SERVER_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.dailyRoom) {
        const token = data.dailyToken;
        setClientUrl(token ? `${data.dailyRoom}?t=${token}` : data.dailyRoom);
      } else {
        setClientUrl(`${VOICE_SERVER_URL}/client`);
      }
      setStage('active');
      startPollingCompletion();
    } catch (e) {
      console.error('Failed to start interview:', e);
    } finally {
      setConnecting(false);
    }
  }, [startPollingCompletion]);

  const endInterview = useCallback(async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    navigate('/review');
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // --- Render ---
  if (stage === 'intro') return <IntroScreen onStart={startInterview} connecting={connecting} />;
  if (stage === 'summary' && postResult) return <SummaryScreen result={postResult} onContinue={() => navigate('/review')} />;

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left: Voice interface */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Phase indicator */}
        <div className="mb-8 flex items-center gap-2 flex-wrap justify-center">
          {Object.entries(PHASE_LABELS).map(([key, label]) => (
            <div
              key={key}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-500',
                key === currentPhase
                  ? 'bg-primary text-on-primary scale-110'
                  : key === 'complete'
                    ? 'bg-surface-container text-outline'
                    : Object.keys(PHASE_LABELS).indexOf(key) < Object.keys(PHASE_LABELS).indexOf(currentPhase)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-surface-container text-outline'
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Voice client */}
        {clientUrl && (
          <div className="w-full max-w-md mb-6">
            <iframe
              src={clientUrl}
              allow="microphone; autoplay"
              className="w-full h-[420px] border-0 rounded-2xl overflow-hidden bg-surface-container-lowest border-2 border-outline-variant/20"
              title="Voice Conversation"
            />
          </div>
        )}

        <p className="text-xs text-outline mb-4">
          Speak naturally — Threshold is listening
        </p>

        {/* Completion ring */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" className="text-surface-container-high" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24" fill="none" stroke="currentColor"
                className="text-primary transition-all duration-700"
                strokeWidth="4"
                strokeDasharray={`${(completionPct / 100) * 150.8} 150.8`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-on-surface">
              {Math.round(completionPct)}%
            </span>
          </div>
          <span className="text-sm text-on-surface-variant">Profile complete</span>
        </div>

        {/* Observation activity */}
        {recentObs.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap justify-center">
            {recentObs.map((cat, i) => (
              <span
                key={`${cat}-${i}`}
                className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-semibold animate-fade-in"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={endInterview}
            className="px-5 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-semibold hover:bg-error/20 transition-colors"
          >
            <span className="material-symbols-outlined text-sm mr-1 align-middle">stop</span>
            End Conversation
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-sm mr-1 align-middle">keyboard</span>
            Switch to Text
          </button>
        </div>
      </div>

      {/* Right: Live schema viz */}
      <div className="w-80 border-l border-outline-variant/20 bg-surface-container-lowest p-4 overflow-y-auto">
        <h3 className="font-headline font-bold text-sm text-on-surface mb-4">Live Profile</h3>
        {Object.entries(SCHEMA_SECTIONS).map(([sectionKey, section]) => {
          const filled = filledFields[sectionKey] || new Set();
          const help = needsHelpFields[sectionKey] || new Set();
          const sectionTotal = section.fields.length;
          const sectionFilled = filled.size;

          return (
            <div key={sectionKey} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-sm text-on-surface-variant">{section.icon}</span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{section.label}</span>
                <span className="ml-auto text-[10px] text-outline">{sectionFilled}/{sectionTotal}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {section.fields.map((field) => {
                  const isFilled = filled.has(field);
                  const isHelp = help.has(field);
                  return (
                    <span
                      key={field}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-500',
                        isFilled
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : isHelp
                            ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                            : 'bg-surface-container text-outline border border-outline-variant/20'
                      )}
                      title={field.replace(/_/g, ' ')}
                    >
                      {field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 18)}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-screens
// ---------------------------------------------------------------------------

function IntroScreen({ onStart, connecting }: { onStart: () => void; connecting: boolean }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
        </div>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-3">Let's Get You Set Up</h1>
        <p className="text-on-surface-variant text-sm mb-2">
          We'll have a short conversation to understand your situation so Threshold can start helping right away.
        </p>
        <p className="text-outline text-xs mb-8">
          Takes about 10-15 minutes. You can skip any question. Everything is private and encrypted.
        </p>

        <button
          onClick={onStart}
          disabled={connecting}
          className={cn(
            'w-full py-4 rounded-xl font-headline font-bold text-sm transition-all duration-200',
            connecting
              ? 'bg-surface-container text-outline cursor-not-allowed'
              : 'bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-md shadow-primary/20'
          )}
        >
          {connecting ? 'Connecting...' : 'Start Conversation'}
          {!connecting && <span className="material-symbols-outlined text-sm ml-1.5 align-middle">arrow_forward</span>}
        </button>

        <button
          onClick={() => window.location.href = '/chat'}
          className="mt-4 text-xs text-outline hover:text-on-surface-variant transition-colors"
        >
          I'd rather type
        </button>
      </div>
    </div>
  );
}

function SummaryScreen({ result, onContinue }: { result: PostInterviewResult; onContinue: () => void }) {
  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl text-on-surface mb-2">Conversation Complete</h1>
          <p className="text-on-surface-variant text-sm">
            {result.stats.fields_captured} fields captured, {result.stats.observations_logged} observations logged.
            Your profile is {Math.round(result.stats.completion_pct)}% complete.
          </p>
        </div>

        <div className="bg-surface-container-low rounded-2xl p-6 mb-6 border border-outline-variant/20">
          <h2 className="font-headline font-bold text-sm text-on-surface mb-3">What We Heard</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">{result.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {result.highlights.goals.length > 0 && (
            <HighlightCard title="Goals" icon="flag" items={result.highlights.goals} color="primary" />
          )}
          {result.highlights.strengths.length > 0 && (
            <HighlightCard title="Strengths" icon="stars" items={result.highlights.strengths} color="secondary" />
          )}
          {result.highlights.concerns.length > 0 && (
            <HighlightCard title="To Watch" icon="visibility" items={result.highlights.concerns} color="tertiary" />
          )}
          {result.highlights.needs_follow_up.length > 0 && (
            <HighlightCard title="Needs Follow-up" icon="help" items={result.highlights.needs_follow_up} color="tertiary" />
          )}
        </div>

        {result.care_plan.length > 0 && (
          <div className="mb-8">
            <h2 className="font-headline font-bold text-sm text-on-surface mb-3">Recommended Next Steps</h2>
            <div className="space-y-2">
              {result.care_plan.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-colors',
                    item.priority === 'urgent'
                      ? 'border-error/30 bg-error-container/30'
                      : item.priority === 'high'
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-outline-variant/20 bg-surface-container-low'
                  )}
                >
                  <p className="text-sm font-semibold text-on-surface">{item.action}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onContinue}
          className="w-full py-4 rounded-xl font-headline font-bold text-sm bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-md shadow-primary/20 transition-all"
        >
          Review Your Profile
          <span className="material-symbols-outlined text-sm ml-1.5 align-middle">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

function HighlightCard({ title, icon, items, color }: { title: string; icon: string; items: string[]; color: string }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20">
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined text-sm text-${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{title}</span>
      </div>
      <ul className="space-y-1">
        {items.slice(0, 3).map((item, i) => (
          <li key={i} className="text-xs text-on-surface-variant leading-relaxed">{item}</li>
        ))}
      </ul>
    </div>
  );
}
