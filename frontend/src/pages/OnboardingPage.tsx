import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface IntakeData {
  name: string;
  location: string;
  housingStatus: string;
  supervision: string;
  immediateNeeds: string[];
}

// ── Card select helpers ───────────────────────────────────────────────────────

interface CardOption {
  value: string;
  label: string;
  icon: string;
}

function SelectCard({
  option,
  selected,
  onSelect,
}: {
  option: CardOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 w-full',
        selected
          ? 'border-primary bg-primary/8 shadow-sm'
          : 'border-outline-variant/30 bg-surface-container-low hover:border-primary/40 hover:bg-surface-container'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
          selected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
        )}
      >
        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: selected ? "'FILL' 1" : "'FILL' 0" }}>
          {option.icon}
        </span>
      </div>
      <span className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-on-surface')}>
        {option.label}
      </span>
      {selected && (
        <span className="ml-auto material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
      )}
    </button>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i === current
              ? 'w-6 h-2 bg-primary'
              : i < current
                ? 'w-2 h-2 bg-primary/40'
                : 'w-2 h-2 bg-outline-variant/30'
          )}
        />
      ))}
    </div>
  );
}

// ── Screen data ───────────────────────────────────────────────────────────────

const HOUSING_OPTIONS: CardOption[] = [
  { value: 'housed', label: 'I have a place', icon: 'home' },
  { value: 'shelter', label: 'Shelter or program', icon: 'night_shelter' },
  { value: 'couch_surfing', label: 'Couch surfing', icon: 'people' },
  { value: 'unhoused', label: 'Other / unsure', icon: 'help' },
];

const SUPERVISION_OPTIONS: CardOption[] = [
  { value: 'none', label: 'None', icon: 'check_circle' },
  { value: 'probation', label: 'Probation', icon: 'gavel' },
  { value: 'parole', label: 'Parole', icon: 'supervised_user_circle' },
  { value: 'supervised_release', label: 'Supervised release', icon: 'manage_accounts' },
];

const NEEDS_OPTIONS: CardOption[] = [
  { value: 'employment', label: 'Employment', icon: 'work' },
  { value: 'housing', label: 'Housing', icon: 'home' },
  { value: 'benefits', label: 'Benefits', icon: 'health_and_safety' },
  { value: 'legal', label: 'Legal help', icon: 'gavel' },
  { value: 'id_documents', label: 'ID documents', icon: 'badge' },
  { value: 'support', label: 'Just want to talk', icon: 'favorite' },
];

// ── OnboardingPage ────────────────────────────────────────────────────────────

const TOTAL_SCREENS = 3;

export function OnboardingPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(0);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<IntakeData>({
    name: '',
    location: 'Hartford, CT',
    housingStatus: '',
    supervision: '',
    immediateNeeds: [],
  });

  // ── Handlers ──

  function handleHousingSelect(value: string) {
    setData((d) => ({ ...d, housingStatus: value }));
    setTimeout(() => setScreen(2), 300);
  }

  function handleSupervisionSelect(value: string) {
    setData((d) => ({ ...d, supervision: value }));
  }

  function toggleNeed(value: string) {
    setData((d) => ({
      ...d,
      immediateNeeds: d.immediateNeeds.includes(value)
        ? d.immediateNeeds.filter((n) => n !== value)
        : [...d.immediateNeeds, value],
    }));
  }

  async function handleFinish() {
    setSaving(true);
    try {
      if (data.name) {
        await updateProfile('personal', { name: data.name, home_state: data.location });
      }
      if (data.housingStatus) {
        await updateProfile('situation', {
          housing_status: data.housingStatus,
          supervision_type: data.supervision || 'none',
          immediate_needs: data.immediateNeeds,
        });
      }
    } catch {
      // Backend may not be running — navigate anyway
    } finally {
      navigate('/dashboard');
    }
  }

  function skip() {
    navigate('/dashboard');
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>anchor</span>
          <span className="font-headline font-extrabold text-lg tracking-tight">Threshold</span>
        </div>
        <button
          onClick={skip}
          className="text-xs font-bold text-outline hover:text-on-surface transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-container-low"
        >
          Skip
        </button>
      </div>

      {/* Progress */}
      <div className="px-6 mb-8">
        <ProgressDots current={screen} total={TOTAL_SCREENS} />
      </div>

      {/* Screen content */}
      <div className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full">

        {/* ── Screen 0: Identity ── */}
        {screen === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-1">
                Let's get started.
              </h1>
              <p className="text-on-surface-variant text-sm">
                Tell us a bit about yourself so we can personalize your experience.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                  Your first name
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                  placeholder="First name"
                  autoFocus
                  className="w-full px-4 py-3.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                  City / state
                </label>
                <input
                  type="text"
                  value={data.location}
                  onChange={(e) => setData((d) => ({ ...d, location: e.target.value }))}
                  placeholder="e.g. Hartford, CT"
                  className="w-full px-4 py-3.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <button
              onClick={() => setScreen(1)}
              disabled={!data.name.trim()}
              className={cn(
                'w-full py-4 rounded-xl font-headline font-bold text-sm transition-all duration-200',
                data.name.trim()
                  ? 'bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-md shadow-primary/20'
                  : 'bg-surface-container text-outline cursor-not-allowed'
              )}
            >
              Continue
              <span className="material-symbols-outlined text-sm ml-1.5 align-middle">arrow_forward</span>
            </button>
          </div>
        )}

        {/* ── Screen 1: Situation ── */}
        {screen === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-1">
                Your situation
              </h1>
              <p className="text-on-surface-variant text-sm">
                This helps us find the right resources for you. You can update this anytime.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                  Where are you staying?
                </p>
                <div className="space-y-2">
                  {HOUSING_OPTIONS.map((opt) => (
                    <SelectCard
                      key={opt.value}
                      option={opt}
                      selected={data.housingStatus === opt.value}
                      onSelect={() => handleHousingSelect(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                  Supervision status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SUPERVISION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSupervisionSelect(opt.value)}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all duration-200',
                        data.supervision === opt.value
                          ? 'border-primary bg-primary/8 text-primary'
                          : 'border-outline-variant/30 bg-surface-container-low hover:border-primary/40 text-on-surface'
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: data.supervision === opt.value ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {opt.icon}
                      </span>
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Screen 2: Immediate needs ── */}
        {screen === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-1">
                What matters most?
              </h1>
              <p className="text-on-surface-variant text-sm">
                Select everything you'd like help with. We'll focus there first.
              </p>
            </div>

            <div className="space-y-2">
              {NEEDS_OPTIONS.map((opt) => (
                <SelectCard
                  key={opt.value}
                  option={opt}
                  selected={data.immediateNeeds.includes(opt.value)}
                  onSelect={() => toggleNeed(opt.value)}
                />
              ))}
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              className={cn(
                'w-full py-4 rounded-xl font-headline font-bold text-sm transition-all duration-200',
                saving
                  ? 'bg-surface-container text-outline cursor-not-allowed'
                  : 'bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-md shadow-primary/20'
              )}
            >
              {saving ? 'Setting up your profile...' : "Let's go"}
              {!saving && (
                <span className="material-symbols-outlined text-sm ml-1.5 align-middle">arrow_forward</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
