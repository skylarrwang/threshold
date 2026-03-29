import { useContextPanelStore } from '@/store/contextPanelStore';

export function CrisisCard() {
  const dismiss = useContextPanelStore((s) => s.dismissCrisis);

  return (
    <div className="rounded-xl border-2 border-red-400/60 bg-red-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Dramatic header bar */}
      <div className="bg-red-500 px-3 py-2 flex items-center gap-2">
        <span
          className="material-symbols-outlined text-white"
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
        >
          emergency
        </span>
        <span className="text-xs font-bold text-white uppercase tracking-wider flex-1">
          Crisis Support Activated
        </span>
        <button
          type="button"
          onClick={dismiss}
          className="text-white/70 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            close
          </span>
        </button>
      </div>

      {/* Resources */}
      <div className="p-3 space-y-2.5">
        <p className="text-xs text-red-900/80 font-medium">
          You are not alone. Reach out now:
        </p>

        <div className="space-y-2">
          <a
            href="tel:988"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/80 border border-red-200 hover:bg-white transition-colors"
          >
            <span
              className="material-symbols-outlined text-red-600"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
            >
              call
            </span>
            <div className="flex-1">
              <div className="text-xs font-bold text-red-900">988 Suicide & Crisis Lifeline</div>
              <div className="text-[10px] text-red-700/70">Call or text 988 — 24/7</div>
            </div>
          </a>

          <a
            href="sms:741741&body=HELLO"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/80 border border-red-200 hover:bg-white transition-colors"
          >
            <span
              className="material-symbols-outlined text-red-600"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
            >
              sms
            </span>
            <div className="flex-1">
              <div className="text-xs font-bold text-red-900">Crisis Text Line</div>
              <div className="text-[10px] text-red-700/70">Text HOME to 741741</div>
            </div>
          </a>

          <a
            href="tel:1-800-662-4357"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/80 border border-red-200 hover:bg-white transition-colors"
          >
            <span
              className="material-symbols-outlined text-red-600"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
            >
              health_and_safety
            </span>
            <div className="flex-1">
              <div className="text-xs font-bold text-red-900">SAMHSA Helpline</div>
              <div className="text-[10px] text-red-700/70">1-800-662-4357 — free & confidential</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
