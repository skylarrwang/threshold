import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';

const TAB_ICONS: Record<string, string> = {
  ai: 'support_agent',
  counselor: 'person',
  resource: 'info',
};

export function ConversationTabs() {
  const { conversations, activeConversationId, setActiveConversation } = useChatStore();

  // Sort AI first, then counselor, then resource
  const sorted = [...conversations].sort((a, b) => {
    const order = { ai: 0, counselor: 1, resource: 2 };
    return (order[a.participantType] ?? 3) - (order[b.participantType] ?? 3);
  });

  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-outline-variant/10 bg-surface-container-lowest/80 backdrop-blur-sm flex-shrink-0">
      {sorted.map((conv) => {
        const isActive = conv.id === activeConversationId;
        const isAI = conv.participantType === 'ai';
        const icon = TAB_ICONS[conv.participantType] ?? 'chat';

        return (
          <button
            key={conv.id}
            onClick={() => setActiveConversation(conv.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 relative',
              isActive && isAI && 'bg-primary text-on-primary shadow-sm',
              isActive && !isAI && 'bg-surface-container-lowest text-on-surface shadow-sm ring-1 ring-outline-variant/20',
              !isActive && 'text-on-surface-variant hover:bg-surface-container-low'
            )}
          >
            <span
              className="material-symbols-outlined text-base"
              style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" : undefined }}
            >
              {icon}
            </span>
            <span>{isAI ? 'Threshold' : conv.participantName}</span>
            {!isActive && conv.unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {conv.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
