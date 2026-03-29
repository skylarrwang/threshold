import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';

const USER_ID = 'tyler-001';
const USER_NAME = 'Tyler Chen';

interface ChatInputProps {
  onSend: (content: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const { activeConversationId, addMessage, wsStatus, isTyping, streamingMessageId } = useChatStore();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = isTyping || streamingMessageId !== null;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    // Add user message to the thread immediately
    addMessage({
      id: `msg-user-${Date.now()}`,
      conversationId: activeConversationId,
      senderId: USER_ID,
      senderName: USER_NAME,
      content: trimmed,
      timestamp: new Date().toISOString(),
      isRead: false,
    });

    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Send over WebSocket (or fall back gracefully if disconnected)
    onSend(trimmed);
  }

  // Connection status dot
  const dotColor =
    wsStatus === 'connected'
      ? 'bg-green-500'
      : wsStatus === 'connecting'
        ? 'bg-amber-400'
        : 'bg-outline/40';

  const dotTitle =
    wsStatus === 'connected'
      ? 'Connected'
      : wsStatus === 'connecting'
        ? 'Connecting...'
        : 'Disconnected';

  return (
    <div className="p-4 bg-surface-container-lowest flex-shrink-0">
      <div className="max-w-4xl mx-auto">
        <div
          className={cn(
            'flex items-end gap-2 p-2 pl-3 bg-surface-container-low rounded-2xl',
            'focus-within:ring-2 focus-within:ring-primary/20 transition-all'
          )}
        >
          {/* Connection status dot */}
          <div className="flex items-center flex-shrink-0 mb-2 ml-0.5" title={dotTitle}>
            <span
              className={cn(
                'w-2 h-2 rounded-full transition-colors duration-500',
                dotColor,
                wsStatus === 'connecting' && 'animate-pulse'
              )}
            />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isBusy ? 'Waiting for response...' : 'Type a message...'}
            disabled={isBusy}
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline resize-none py-2 focus:outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: '120px' }}
          />

          {/* Send */}
          <button
            aria-label="Send message"
            onClick={handleSend}
            disabled={!text.trim() || isBusy}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0 mb-0.5',
              text.trim() && !isBusy
                ? 'bg-primary text-on-primary hover:bg-primary-container active:scale-95 shadow-md shadow-primary/20'
                : 'bg-surface-container text-outline cursor-not-allowed'
            )}
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </div>

        <p className="text-[10px] text-center text-outline mt-2.5 font-medium">
          Messages are private and secure.
        </p>
      </div>
    </div>
  );
}
