import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Avatar } from '@/components/shared/Avatar';
import { cn } from '@/lib/utils';

const USER_ID = 'marcus-001';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-outline-variant/20" />
      <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant text-[10px] font-bold rounded-full tracking-widest uppercase">
        {label}
      </span>
      <div className="flex-1 h-px bg-outline-variant/20" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-xs">
      <Avatar name="Diana" size="sm" />
      <div className="bg-surface-container-lowest rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
        <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export function MessageThread() {
  const { messages, activeConversationId, isTyping } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadMessages = messages.filter((m) => m.conversationId === activeConversationId);

  // Auto-scroll to bottom when messages or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length, isTyping]);

  // Group messages by date for date separators
  const groups: { dateLabel: string; messages: typeof threadMessages }[] = [];
  for (const msg of threadMessages) {
    const label = formatDateLabel(msg.timestamp);
    const last = groups[groups.length - 1];
    if (!last || last.dateLabel !== label) {
      groups.push({ dateLabel: label, messages: [msg] });
    } else {
      last.messages.push(msg);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1 no-scrollbar bg-gradient-to-br from-teal-50/10 via-transparent to-transparent">
      {groups.map((group) => (
        <div key={group.dateLabel}>
          <DateSeparator label={group.dateLabel} />
          <div className="space-y-4 mt-4">
            {group.messages.map((msg) => {
              const isOutgoing = msg.senderId === USER_ID;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex items-start gap-3',
                    isOutgoing ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  {!isOutgoing ? (
                    <Avatar name={msg.senderName} size="sm" className="flex-shrink-0 mt-1" />
                  ) : (
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={cn('flex flex-col gap-1.5 max-w-sm lg:max-w-md', isOutgoing ? 'items-end' : 'items-start')}>
                    {!isOutgoing && (
                      <span className="text-[11px] font-semibold text-on-surface-variant px-1">
                        {msg.senderName}
                      </span>
                    )}
                    <div
                      className={cn(
                        'px-4 py-3 text-sm leading-relaxed shadow-sm',
                        isOutgoing
                          ? 'bg-primary text-on-primary rounded-2xl rounded-tr-sm shadow-primary/10'
                          : 'bg-surface-container-lowest text-on-surface rounded-2xl rounded-tl-sm'
                      )}
                    >
                      {msg.content}
                    </div>
                    <div className={cn('flex items-center gap-1.5 px-1', isOutgoing ? 'flex-row-reverse' : 'flex-row')}>
                      <span className="text-[10px] text-outline font-medium">{formatTime(msg.timestamp)}</span>
                      {isOutgoing && msg.isRead && (
                        <span className="material-symbols-outlined text-[14px] text-primary">done_all</span>
                      )}
                      {isOutgoing && !msg.isRead && (
                        <span className="material-symbols-outlined text-[14px] text-outline">done</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {isTyping && (
        <div className="mt-4">
          <TypingIndicator />
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
