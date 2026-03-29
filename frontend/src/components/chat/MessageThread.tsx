import { useEffect, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '@/store/chatStore';
import { useProfileStore } from '@/store/profileStore';
import { Avatar } from '@/components/shared/Avatar';
import { ToolCard } from './ToolCard';
import { AgentTrace } from './AgentTrace';
import { cn } from '@/lib/utils';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-xs">
      <Avatar name="AI" size="sm" />
      <div className="bg-surface-container-lowest rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
        <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h3 className="font-bold text-base mb-1 mt-2 first:mt-0">{children}</h3>,
        h2: ({ children }) => <h3 className="font-bold text-base mb-1 mt-2 first:mt-0">{children}</h3>,
        h3: ({ children }) => <h4 className="font-semibold mb-1 mt-2 first:mt-0">{children}</h4>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="bg-black/10 rounded px-1 py-0.5 text-[13px] font-mono">{children}</code>
        ),
        hr: () => <hr className="my-2 border-current/20" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 rounded-lg border border-outline-variant/20">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-surface-container-high/50 text-on-surface-variant font-semibold">{children}</thead>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-outline-variant/10">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-surface-container-high/20 transition-colors">{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

export function MessageThread() {
  const { messages, activeConversationId, isTyping, streamingMessageId, activeToolCall, agentSteps } = useChatStore();
  const userId = useProfileStore((s) => s.profile.user_id);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadMessages = messages.filter((m) => m.conversationId === activeConversationId);

  const lastMessage = threadMessages[threadMessages.length - 1];
  const streamingContent = streamingMessageId ? lastMessage?.content : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length, isTyping, streamingContent, activeToolCall, agentSteps.length]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1 no-scrollbar bg-gradient-to-br from-teal-50/10 via-transparent to-transparent">
      <div className="space-y-4">
        {threadMessages.map((msg) => {
          const isOutgoing = msg.senderId === userId;
          const isStreaming = msg.id === streamingMessageId;

          // Hide the empty placeholder bubble while the agent is working —
          // the AgentTrace component shows progress instead.
          if (isStreaming && !msg.content) return null;

          return (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3',
                isOutgoing ? 'justify-end pl-16 sm:pl-24 lg:pl-32' : 'justify-start pr-16 sm:pr-24 lg:pr-32'
              )}
            >
              {/* Avatar (AI only) */}
              {!isOutgoing && (
                <Avatar name={msg.senderName} size="sm" className="flex-shrink-0 mt-1" />
              )}

              {/* Bubble */}
              <div className={cn('flex flex-col gap-1.5 min-w-0', isOutgoing ? 'items-end' : 'items-start')}>
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
                  {msg.isAI ? (
                    <span className={isStreaming ? 'streaming-cursor' : ''}>
                      <Markdown content={msg.content} />
                    </span>
                  ) : (
                    msg.content
                  )}
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

              {/* Avatar (user only) */}
              {isOutgoing && (
                <div className="w-8 h-8 bg-primary/10 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Agent trace — live step feed */}
      <AgentTrace />

      {/* Tool call indicator (inline, above any streaming response) */}
      <ToolCard activeToolCall={activeToolCall} />

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
