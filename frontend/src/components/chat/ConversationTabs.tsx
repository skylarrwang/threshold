import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';

export function ConversationTabs() {
  const { conversations, activeConversationId, setActiveConversation, createConversation, deleteConversation, streamingMessageId } = useChatStore();

  const isBusy = streamingMessageId !== null;

  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-outline-variant/10 bg-surface-container-lowest/80 backdrop-blur-sm flex-shrink-0 overflow-x-auto">
      {conversations.map((conv) => {
        const isActive = conv.id === activeConversationId;

        return (
          <button
            key={conv.id}
            onClick={() => setActiveConversation(conv.id)}
            className={cn(
              'group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex-shrink-0 max-w-[180px]',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            <span className="truncate">{conv.title}</span>
            {conversations.length > 1 && !isBusy && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className={cn(
                  'w-5 h-5 flex items-center justify-center rounded-md transition-colors flex-shrink-0',
                  isActive
                    ? 'hover:bg-primary/15 text-primary/60 hover:text-primary'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-surface-container text-outline hover:text-on-surface-variant',
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </span>
            )}
          </button>
        );
      })}

      {/* New conversation */}
      <button
        onClick={createConversation}
        disabled={isBusy}
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0',
          isBusy
            ? 'text-outline/40 cursor-not-allowed'
            : 'text-outline hover:bg-surface-container-low hover:text-on-surface-variant',
        )}
        title="New conversation"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
      </button>
    </div>
  );
}
