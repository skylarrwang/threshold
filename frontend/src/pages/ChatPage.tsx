import { useChatStore } from '@/store/chatStore';
import { useChatSocket } from '@/lib/websocket';
import { MessageThread } from '@/components/chat/MessageThread';
import { ChatInput } from '@/components/chat/ChatInput';
import { CrisisBlock } from '@/components/chat/CrisisBlock';
import { ConversationTabs } from '@/components/chat/ConversationTabs';

export function ChatPage() {
  const { isCrisisMode } = useChatStore();
  const { sendMessage } = useChatSocket();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-container-lowest">
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
