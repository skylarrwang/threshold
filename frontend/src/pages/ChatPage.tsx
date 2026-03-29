import { useSearchParams } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useChatSocket } from '@/lib/websocket';
import { MessageThread } from '@/components/chat/MessageThread';
import { ChatInput } from '@/components/chat/ChatInput';
import { CrisisBlock } from '@/components/chat/CrisisBlock';
import { ConversationTabs } from '@/components/chat/ConversationTabs';

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isCrisisMode } = useChatStore();
  const { sendMessage } = useChatSocket();
  const initialPrompt = searchParams.get('prompt') || '';

  // Clear the query param after reading so it doesn't re-trigger on re-renders
  if (initialPrompt) {
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-container-lowest">
      {/* Conversation tabs */}
      <ConversationTabs />

      {/* Crisis block */}
      {isCrisisMode && <CrisisBlock />}

      {/* Scrollable message thread */}
      <MessageThread />

      {/* Pinned input at bottom */}
      <ChatInput onSend={sendMessage} initialPrompt={initialPrompt} />
    </div>
  );
}
