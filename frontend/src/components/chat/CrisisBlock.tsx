import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';

interface CrisisResource {
  name: string;
  number: string;
  description: string;
  href: string;
  icon: string;
}

const RESOURCES: CrisisResource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    number: '988',
    description: 'Call or text 988 — free, confidential, 24/7',
    href: 'tel:988',
    icon: 'call',
  },
  {
    name: 'Crisis Text Line',
    number: 'Text HOME to 741741',
    description: 'Text HOME to 741741 — free, 24/7 text-based support',
    href: 'sms:741741?body=HOME',
    icon: 'chat',
  },
  {
    name: 'SAMHSA National Helpline',
    number: '1-800-662-4357',
    description: 'Substance use & mental health — free, confidential, 24/7',
    href: 'tel:18006624357',
    icon: 'support',
  },
];

export function CrisisBlock() {
  const dismissCrisis = useChatStore((s) => s.dismissCrisis);
  const [dismissed, setDismissed] = useState(false);

  function handleDismiss() {
    setDismissed(true);
    // Keep in history with muted style but no longer pinned
    setTimeout(dismissCrisis, 400);
  }

  return (
    <div
      className={`mx-4 mb-4 rounded-2xl border-2 border-sky-300 bg-sky-50 p-5 transition-opacity duration-400 ${dismissed ? 'opacity-40' : 'opacity-100'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-200 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-sky-700 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-sky-900 text-sm leading-tight">You're not alone</h3>
            <p className="text-sky-700 text-xs mt-0.5">Free crisis support is available right now.</p>
          </div>
        </div>
      </div>

      {/* Resource links */}
      <div className="space-y-2.5 mb-4">
        {RESOURCES.map((r) => (
          <a
            key={r.name}
            href={r.href}
            className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-sky-50 border border-sky-200 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-sky-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                {r.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-sky-900 group-hover:text-sky-700">{r.name}</p>
              <p className="text-[11px] text-sky-600">{r.description}</p>
            </div>
            <span className="material-symbols-outlined text-sky-400 text-base flex-shrink-0">chevron_right</span>
          </a>
        ))}
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="w-full py-2.5 text-xs font-bold text-sky-700 hover:text-sky-900 border border-sky-200 rounded-xl hover:bg-sky-100 transition-colors"
      >
        I'm okay for now
      </button>
    </div>
  );
}
