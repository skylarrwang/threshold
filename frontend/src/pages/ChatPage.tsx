import { useState, useEffect } from 'react';
import type { Conversation } from '@/types';
import { useChatStore } from '@/store/chatStore';
import { MessageThread } from '@/components/chat/MessageThread';
import { ChatInput } from '@/components/chat/ChatInput';
import { InsightSidebar } from '@/components/chat/InsightSidebar';
import { Avatar } from '@/components/shared/Avatar';
import { StatusDot } from '@/components/shared/StatusDot';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ParticipantIcon({ type }: { type: Conversation['participantType'] }) {
  if (type === 'counselor') {
    return (
      <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-on-primary-fixed text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
      </div>
    );
  }
  if (type === 'ai') {
    return (
      <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center flex-shrink-0">
      <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-xl">info</span>
    </div>
  );
}

interface ConversationListPanelProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
}

function ConversationListPanel({ conversations, activeId, onSelect }: ConversationListPanelProps) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(
    (c) =>
      c.participantName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="p-6 pb-3 flex-shrink-0">
        <h2 className="text-2xl font-extrabold font-headline text-on-surface mb-5">Messages</h2>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 no-scrollbar">
        {filtered.map((conv) => {
          const isActive = conv.id === activeId;
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all text-left',
                isActive
                  ? 'bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/20'
                  : 'hover:bg-surface-container-low'
              )}
            >
              {/* Avatar with online dot */}
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

              {/* Text */}
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

// ── ChatPage ──────────────────────────────────────────────────────────────────

export function ChatPage() {
  const { conversations, activeConversationId, setActiveConversation, initSocket, disconnectSocket } = useChatStore();
  const [mobileShowList, setMobileShowList] = useState(true);

  useEffect(() => {
    initSocket();
    return () => disconnectSocket();
  }, [initSocket, disconnectSocket]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  function handleSelectConversation(id: string) {
    setActiveConversation(id);
    setMobileShowList(false);
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Column 1: Conversation list ── */}
      <div
        className={cn(
          'w-full md:w-72 flex-shrink-0 flex flex-col border-r border-outline-variant/10',
          mobileShowList ? 'flex' : 'hidden',
          'md:flex'
        )}
      >
        <ConversationListPanel
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* ── Column 2 + 3: Thread + Sidebar ── */}
      <div
        className={cn(
          'flex-1 overflow-hidden',
          !mobileShowList ? 'flex' : 'hidden',
          'md:flex'
        )}
      >
        {/* ── Column 2: Message thread ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-container-lowest">

          {/* Thread header */}
          <header className="flex items-center justify-between px-5 py-4 bg-surface-container-lowest/90 backdrop-blur-md flex-shrink-0 border-b border-outline-variant/10 z-10">
            <div className="flex items-center gap-3">
              {/* Back button — mobile only */}
              <button
                onClick={() => setMobileShowList(true)}
                className="md:hidden p-1.5 -ml-1 hover:bg-surface-container-low rounded-xl transition-colors text-on-surface"
                aria-label="Back to conversations"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>

              {activeConversation && (
                <>
                  <Avatar name={activeConversation.participantName} size="sm" />
                  <div>
                    <h2 className="font-bold font-headline text-base text-on-surface leading-tight">
                      {activeConversation.participantName}
                    </h2>
                    {activeConversation.isOnline ? (
                      <span className="text-[11px] text-primary font-bold flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                        </span>
                        Active now
                      </span>
                    ) : (
                      <span className="text-[11px] text-outline font-medium flex items-center gap-1.5">
                        <StatusDot online={false} pulse={false} />
                        Offline
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-1">
              <button
                className="p-2 hover:bg-surface-container-low rounded-xl transition-colors text-outline"
                aria-label="Video call"
              >
                <span className="material-symbols-outlined text-xl">videocam</span>
              </button>
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

        {/* ── Column 3: Insight sidebar — large screens only ── */}
        <div className="hidden lg:flex w-80 flex-shrink-0 flex-col border-l border-outline-variant/10 overflow-hidden">
          <InsightSidebar />
        </div>
      </div>
    </div>
  );
}
