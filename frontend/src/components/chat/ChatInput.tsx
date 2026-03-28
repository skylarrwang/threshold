import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';

const USER_ID = 'marcus-001';
const USER_NAME = 'Marcus Chen';

const AI_RESPONSES = [
  "Thanks for your message! I'm looking into that for you now. Give me just a moment to find the most relevant information.",
  "Got it! I'm on it. Based on what you've shared, I think I can help — let me pull up the details.",
  "I hear you. Let me check what options are available for your situation and get back to you right away.",
  "Absolutely, I can help with that. Looking up the latest resources in your area now.",
  "That's a great question. Let me find the most up-to-date information so you get the best guidance.",
];

function getAIResponse(): string {
  return AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
}

export function ChatInput() {
  const { activeConversationId, addMessage, setTyping } = useChatStore();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsgId = `msg-user-${Date.now()}`;
    addMessage({
      id: userMsgId,
      conversationId: activeConversationId,
      senderId: USER_ID,
      senderName: USER_NAME,
      content: trimmed,
      timestamp: new Date().toISOString(),
      isRead: false,
    });
    setText('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Show typing indicator
    setTyping(true);

    // After delay, start streaming AI response
    typingTimerRef.current = setTimeout(() => {
      setTyping(false);

      const fullResponse = getAIResponse();
      const aiMsgId = `msg-ai-${Date.now()}`;
      let charIndex = 0;
      let accumulated = '';

      // Add the AI message with empty content first
      addMessage({
        id: aiMsgId,
        conversationId: activeConversationId,
        senderId: 'counselor-diana',
        senderName: 'Diana',
        content: '',
        timestamp: new Date().toISOString(),
        isRead: true,
        isAI: true,
      });

      // Stream characters into the message
      streamIntervalRef.current = setInterval(() => {
        if (charIndex >= fullResponse.length) {
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
          return;
        }

        accumulated += fullResponse[charIndex];
        charIndex++;

        // Update the message content in the store
        useChatStore.setState((state) => ({
          messages: state.messages.map((m) =>
            m.id === aiMsgId ? { ...m, content: accumulated } : m
          ),
        }));
      }, 18);
    }, 1000);
  }

  return (
    <div className="p-4 bg-surface-container-lowest flex-shrink-0">
      <div className="max-w-4xl mx-auto">
        <div
          className={cn(
            'flex items-end gap-2 p-2 pl-3 bg-surface-container-low rounded-2xl',
            'focus-within:ring-2 focus-within:ring-primary/20 transition-all'
          )}
        >
          {/* Attach */}
          <button
            aria-label="Attach file"
            className="p-2 hover:bg-surface-container-high rounded-xl transition-colors text-outline flex-shrink-0 mb-0.5"
          >
            <span className="material-symbols-outlined text-xl">attach_file</span>
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline resize-none py-2 focus:outline-none leading-relaxed"
            style={{ maxHeight: '120px' }}
          />

          {/* Emoji */}
          <button
            aria-label="Add emoji"
            className="p-2 hover:bg-surface-container-high rounded-xl transition-colors text-outline flex-shrink-0 mb-0.5"
          >
            <span className="material-symbols-outlined text-xl">sentiment_satisfied</span>
          </button>

          {/* Send */}
          <button
            aria-label="Send message"
            onClick={handleSend}
            disabled={!text.trim()}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0 mb-0.5',
              text.trim()
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
