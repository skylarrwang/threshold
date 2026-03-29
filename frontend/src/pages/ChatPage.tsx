import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useChatSocket } from '@/lib/websocket';
import { MessageThread } from '@/components/chat/MessageThread';
import { ChatInput } from '@/components/chat/ChatInput';
import { CrisisBlock } from '@/components/chat/CrisisBlock';
import { ConversationTabs } from '@/components/chat/ConversationTabs';

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isCrisisMode, createConversation } = useChatStore();
  const { sendMessage } = useChatSocket();

  // Capture prompt from URL on mount, then clear it
  const promptParam = searchParams.get('prompt') || '';
  const capturedPrompt = useRef(promptParam);

  useEffect(() => {
    if (!capturedPrompt.current) return;
    createConversation();
    setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-container-lowest">
      <ConversationTabs />
      {isCrisisMode && <CrisisBlock />}
      <MessageThread />
      <ChatInput onSend={sendMessage} initialPrompt={capturedPrompt.current} />
    </div>
  );
}
