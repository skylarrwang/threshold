import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useChatSocket } from '@/lib/websocket';
import { MessageThread } from '@/components/chat/MessageThread';
import { ChatInput } from '@/components/chat/ChatInput';
import { CrisisBlock } from '@/components/chat/CrisisBlock';
import { ConversationTabs } from '@/components/chat/ConversationTabs';
import { ContextPanel } from '@/components/chat/ContextPanel';

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isCrisisMode, createConversation } = useChatStore();
  const { sendMessage } = useChatSocket();

  // Capture prompt from URL on mount, then clear it
  const isInterview = searchParams.get('interview') === 'true';
  const promptParam = searchParams.get('prompt') || '';
  const capturedPrompt = useRef(
    isInterview
      ? "I just finished basic onboarding. Help me fill in the rest of my profile — start with the most important missing information."
      : promptParam
  );

  useEffect(() => {
    if (!capturedPrompt.current) return;
    createConversation();
    setSearchParams({}, { replace: true });
    // Auto-send the interview prompt
    if (isInterview) {
      setTimeout(() => sendMessage(capturedPrompt.current), 300);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen overflow-hidden bg-surface-container-lowest">
      {/* Left column: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <ConversationTabs />
        {isCrisisMode && <CrisisBlock />}
        <MessageThread />
        <ChatInput onSend={sendMessage} initialPrompt={capturedPrompt.current} />
      </div>

      {/* Right column: Live Context Panel — desktop only */}
      <div className="hidden lg:flex w-96 flex-col border-l border-outline-variant/15 bg-surface-container-lowest/80 backdrop-blur-sm">
        <ContextPanel />
      </div>
    </div>
  );
}
