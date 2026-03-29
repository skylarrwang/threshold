import { useChatStore } from '@/store/chatStore';
import { useChatSocket } from '@/lib/websocket';
import { MessageThread } from '@/components/chat/MessageThread';
import { ChatInput } from '@/components/chat/ChatInput';
import { CrisisBlock } from '@/components/chat/CrisisBlock';
import { ConversationTabs } from '@/components/chat/ConversationTabs';
import { Avatar } from '@/components/shared/Avatar';
import { StatusDot } from '@/components/shared/StatusDot';

export function ChatPage() {
  const { conversations, activeConversationId, isCrisisMode } = useChatStore();
  const { sendMessage } = useChatSocket();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-container-lowest">
      {/* Thread header */}
      <header className="flex items-center justify-between px-5 py-4 bg-surface-container-lowest/90 backdrop-blur-md flex-shrink-0 border-b border-outline-variant/10 z-10">
        <div className="flex items-center gap-3">
          {activeConversation && (
            <>
              <Avatar name={activeConversation.participantType === 'ai' ? 'Threshold' : activeConversation.participantName} size="sm" />
              <div>
                <h2 className="font-bold font-headline text-base text-on-surface leading-tight">
                  {activeConversation.participantType === 'ai' ? 'Threshold' : activeConversation.participantName}
                </h2>
                {activeConversation.isOnline ? (
                  <span className="text-[11px] text-primary font-bold flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    Active now
                  </span>
                ) : (
                  <span className="text-[11px] text-outline font-medium flex items-center gap-1.5">
                    <StatusDot online={false} pulse={false} />
                    Offline
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-surface-container-low rounded-xl transition-colors text-outline"
            aria-label="Conversation info"
          >
            <span className="material-symbols-outlined text-xl">info</span>
          </button>
        </div>
      </header>

      {/* Conversation tabs */}
      <ConversationTabs />

      {/* Crisis block */}
      {isCrisisMode && <CrisisBlock />}

      {/* Scrollable message thread */}
      <MessageThread />

      {/* Pinned input at bottom */}
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
