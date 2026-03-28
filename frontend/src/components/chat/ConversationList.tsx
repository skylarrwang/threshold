import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Avatar } from '@/components/shared/Avatar';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ParticipantIcon({ type }: { type: Conversation['participantType'] }) {
  if (type === 'counselor') {
    return (
      <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="material-symbols-outlined text-on-primary-fixed text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
      </div>
    );
  }
  if (type === 'ai') {
    return (
      <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center flex-shrink-0 shadow-sm">
      <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-xl">info</span>
    </div>
  );
}

export function ConversationList() {
  const { conversations, activeConversationId, setActiveConversation } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((c) =>
    c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="p-6 pb-3 flex-shrink-0">
        <h2 className="text-2xl font-extrabold font-headline text-on-surface mb-5">Messages</h2>
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 no-scrollbar">
        {filtered.map((conv) => {
          const isActive = conv.id === activeConversationId;
          return (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all text-left',
                isActive
                  ? 'bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/20'
                  : 'hover:bg-surface-container-low'
              )}
            >
              {/* Avatar with online indicator */}
              <div className="relative flex-shrink-0">
                {conv.participantType === 'counselor' ? (
                  <Avatar name={conv.participantName} size="lg" online={conv.isOnline} />
                ) : (
                  <div className="relative">
                    <ParticipantIcon type={conv.participantType} />
                    {conv.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary border-2 border-white rounded-full" />
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className={cn('text-sm truncate', isActive ? 'font-bold text-on-surface' : 'font-medium text-on-surface')}>
                    {conv.participantName}
                  </h3>
                  <span className={cn('text-[10px] ml-2 flex-shrink-0', isActive ? 'text-primary font-bold' : 'text-outline')}>
                    {formatTimestamp(conv.lastTimestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-xs truncate', isActive ? 'text-on-surface-variant font-medium' : 'text-outline')}>
                    {conv.lastMessage}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
