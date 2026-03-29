import { useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageThread } from '@/components/chat/MessageThread';
import { ChatInput } from '@/components/chat/ChatInput';
import { InsightSidebar } from '@/components/chat/InsightSidebar';
import { StatusDot } from '@/components/shared/StatusDot';

export function ChatPage() {
  const { initSocket, disconnectSocket, isConnected } = useChatStore();

  useEffect(() => {
    initSocket();
    return () => disconnectSocket();
  }, [initSocket, disconnectSocket]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Message thread ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-container-lowest">
        {/* Thread header */}
        <header className="flex items-center justify-between px-5 py-4 bg-surface-container-lowest/90 backdrop-blur-md flex-shrink-0 border-b border-outline-variant/10 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0">
              <span
                className="material-symbols-outlined text-secondary text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                smart_toy
              </span>
            </div>
            <div>
              <h2 className="font-bold font-headline text-base text-on-surface leading-tight">
                Threshold AI
              </h2>
              <span className="text-[11px] text-primary font-bold flex items-center gap-1.5">
                <StatusDot online={isConnected} pulse={isConnected} />
                {isConnected ? 'Connected' : 'Connecting…'}
              </span>
            </div>
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

        {/* Scrollable message thread */}
        <MessageThread />

        {/* Pinned input at bottom */}
        <ChatInput />
      </div>

      {/* ── Insight sidebar — large screens only ── */}
      <div className="hidden lg:flex w-80 flex-shrink-0 flex-col border-l border-outline-variant/10 overflow-hidden">
        <InsightSidebar />
      </div>
    </div>
  );
}
