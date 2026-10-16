'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { communityConfig } from '@/../community.config';
import { NotificationBell } from '@/components/navigation/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMobile } from '@/hooks/useMobile';
import { followingFeedEnabled } from '@/lib/farcaster/following-feed-flag';
import type { QuotedCastData } from '@/types';
import { ComposeBar, type ComposeBarHandle, type ReplyContext } from './ComposeBar';
import { type ContentFilter, FeedFilters, filterAndSortCasts, type SortMode } from './FeedFilters';
import { MessageList } from './MessageList';
import { Sidebar } from './Sidebar';
import { SignerConnect } from './SignerConnect';
import { ThreadDrawer } from './ThreadDrawer';

const TrendingFeed = dynamic(
  () => import('./TrendingFeed').then((m) => ({ default: m.TrendingFeed })),
  { ssr: false },
);
const FollowingFeed = dynamic(
  () => import('./FollowingFeed').then((m) => ({ default: m.FollowingFeed })),
  { ssr: false },
);
const SearchDialog = dynamic(
  () => import('./SearchDialog').then((m) => ({ default: m.SearchDialog })),
  { ssr: false },
);
const SongSubmit = dynamic(
  () => import('@/components/music/SongSubmit').then((m) => ({ default: m.SongSubmit })),
  { ssr: false },
);
const SchedulePanel = dynamic(
  () => import('./SchedulePanel').then((m) => ({ default: m.SchedulePanel })),
  { ssr: false },
);
const FaqPanel = dynamic(() => import('./FaqPanel').then((m) => ({ default: m.FaqPanel })), {
  ssr: false,
});
const TutorialPanel = dynamic(
  () => import('./TutorialPanel').then((m) => ({ default: m.TutorialPanel })),
  { ssr: false },
);
const EmpirePanel = dynamic(
  () => import('./EmpirePanel').then((m) => ({ default: m.EmpirePanel })),
  { ssr: false },
);
const ProfileDrawer = dynamic(
  () => import('./ProfileDrawer').then((m) => ({ default: m.ProfileDrawer })),
  { ssr: false },
);

export function ChatRoom() {
  const { user, logout, refetch } = useAuth();
  const [activeChannel, setActiveChannel] = useState('zao');
  const [isTrending, setIsTrending] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const showFollowingTab = followingFeedEnabled();
  const inChannel = !isTrending && !isFollowing;
  const {
    messages,
    loading,
    sending,
    error,
    sendError,
    clearSendError,
    sendMessage,
    hideMessage,
    loadMore,
    hasMore,
    loadingMore,
    isRealtime,
  } = useChat(activeChannel);
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedThreadHash, setSelectedThreadHash] = useState<string | null>(null);
  const [quotedCast, setQuotedCast] = useState<QuotedCastData | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyContext | null>(null);
  const [songSubmitOpen, setSongSubmitOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [empireOpen, setEmpireOpen] = useState(false);
  const [profileFid, setProfileFid] = useState<number | null>(null);
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const composeRef = useRef<ComposeBarHandle>(null);

  const viewMode = isTrending ? 'trending' : isFollowing ? 'following' : 'channel';

  const handleChannelSelect = useCallback(
    (ch: string) => {
      setActiveChannel(ch);
      setIsTrending(false);
      setIsFollowing(false);
      setSelectedThreadHash(null);
      setSidebarOpen(false);
    },
    [],
  );

  const handleFollowingSelect = useCallback(() => {
    setIsFollowing(true);
    setIsTrending(false);
    setSelectedThreadHash(null);
    setSidebarOpen(false);
  }, []);

  const handleTrendingSelect = useCallback(() => {
    setIsTrending(true);
    setIsFollowing(false);
    setSelectedThreadHash(null);
    setSidebarOpen(false);
  }, []);

  // Filtered + sorted messages
  const filteredMessages = useMemo(
    () => filterAndSortCasts(messages, contentFilter, sortMode),
    [messages, contentFilter, sortMode],
  );

  // Reset filters on channel switch + fetch submissions for queue

  useEffect(() => {
    setContentFilter('all');
    setSortMode('newest');
  }, [activeChannel]);

  // Keyboard shortcuts
  const shortcutHandlers = useMemo(
    () => ({
      onSearch: () => setSearchOpen(true),
      onFocusCompose: () => composeRef.current?.focus(),
      onClosePanels: () => {
        if (profileFid) {
          setProfileFid(null);
          return;
        }
        if (faqOpen) {
          setFaqOpen(false);
          return;
        }
        if (tutorialOpen) {
          setTutorialOpen(false);
          return;
        }
        if (searchOpen) {
          setSearchOpen(false);
          return;
        }
        if (selectedThreadHash) {
          setSelectedThreadHash(null);
          return;
        }
        if (songSubmitOpen) {
          setSongSubmitOpen(false);
          return;
        }
        if (scheduleOpen) {
          setScheduleOpen(false);
          return;
        }
        if (sidebarOpen) {
          setSidebarOpen(false);
          return;
        }
      },
      onToggleSidebar: () => setSidebarOpen((o) => !o),
    }),
    [
      profileFid,
      faqOpen,
      tutorialOpen,
      searchOpen,
      selectedThreadHash,
      songSubmitOpen,
      scheduleOpen,
      sidebarOpen,
    ],
  );

  useKeyboardShortcuts(shortcutHandlers);

  // Music persists across channel switches — no stop on channel change

  if (!user) return null;

  const hasSigner = !!user.signerUuid;

  return (
    <div className="flex h-[calc(100dvh-9rem)] md:h-[calc(100dvh-6.5rem)] bg-[#0a1628] text-white overflow-hidden">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
        activeChannel={activeChannel}
        onChannelSelect={handleChannelSelect}
        isTrending={isTrending}
        onTrendingSelect={() => {
          handleTrendingSelect();
          setSidebarOpen(false);
        }}
        onOpenFaq={() => {
          setFaqOpen(true);
          setSidebarOpen(false);
        }}
        onOpenTutorial={() => {
          setTutorialOpen(true);
          setSidebarOpen(false);
        }}
        onOpenEmpire={() => {
          setEmpireOpen(true);
          setSidebarOpen(false);
        }}
      />

      {/* Main chat + music sidebar in a shared flex row */}
      <div className="flex flex-1 min-w-0">
        {/* Chat column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] bg-[#0d1b2a] flex-shrink-0">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-400 hover:text-white"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm text-white"># {activeChannel}</h2>
                  {isRealtime && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-600 -mt-0.5">Posting to Farcaster</p>
              </div>

            {(viewMode === 'channel' || viewMode === 'trending' || viewMode === 'following') && (
              <>
                {/* Search */}
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Search messages"
                  title="Search (Cmd+K)"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </button>

                {/* Scheduled posts */}
                <button
                  onClick={() => setScheduleOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Scheduled posts"
                  title="Scheduled posts"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>

                {/* Song submit */}
                <button
                  onClick={() => setSongSubmitOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Submit a song"
                  title="Submit a song"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>

                {/* ZAO Radio */}
                <NotificationBell />
              </>
            )}
          </header>

            <>
              {/* Channel / Trending tab bar */}
              <div
                role="tablist"
                aria-label="Channels"
                className="flex items-center gap-0.5 px-3 py-1.5 bg-[#0d1b2a] border-b border-white/[0.08] overflow-x-auto no-scrollbar flex-shrink-0"
              >
                {showFollowingTab && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isFollowing}
                    onClick={handleFollowingSelect}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isFollowing
                        ? 'bg-[#f5a623]/10 text-[#f5a623]'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Following
                  </button>
                )}
                {communityConfig.farcaster.channels.map((ch) => (
                  <button
                    key={ch}
                    role="tab"
                    aria-selected={inChannel && activeChannel === ch}
                    onClick={() => handleChannelSelect(ch)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      inChannel && activeChannel === ch
                        ? 'bg-[#f5a623]/10 text-[#f5a623]'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    #{ch}
                  </button>
                ))}
                <button
                  role="tab"
                  aria-selected={isTrending}
                  onClick={handleTrendingSelect}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    isTrending
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/5'
                  }`}
                >
                  Trending{' '}
                  <span className="text-[10px]" aria-hidden="true">
                    🔥
                  </span>
                </button>
              </div>

              {isFollowing ? (
                <FollowingFeed
                  isAdmin={user.isAdmin}
                  currentFid={user.fid}
                  hasSigner={hasSigner}
                  onHide={hideMessage}
                  onOpenThread={(hash) => setSelectedThreadHash(hash)}
                  onQuote={(cast) => {
                    setQuotedCast(cast);
                    setSelectedThreadHash(null);
                  }}
                  onOpenProfile={(fid) => setProfileFid(fid)}
                  onReply={(hash, authorName, text) => {
                    setReplyTo({ hash, authorName, text });
                    setQuotedCast(null);
                    composeRef.current?.focus();
                  }}
                />
              ) : isTrending ? (
                <TrendingFeed
                  isAdmin={user.isAdmin}
                  currentFid={user.fid}
                  hasSigner={hasSigner}
                  onHide={hideMessage}
                  onOpenThread={(hash) => setSelectedThreadHash(hash)}
                  onQuote={(cast) => {
                    setQuotedCast(cast);
                    setSelectedThreadHash(null);
                  }}
                  onOpenProfile={(fid) => setProfileFid(fid)}
                  onReply={(hash, authorName, text) => {
                    setReplyTo({ hash, authorName, text });
                    setQuotedCast(null);
                    composeRef.current?.focus();
                  }}
                />
              ) : (
                <>
                  {/* Feed filters */}
                  <FeedFilters
                    contentFilter={contentFilter}
                    sortMode={sortMode}
                    onContentFilterChange={setContentFilter}
                    onSortChange={setSortMode}
                    resultCount={filteredMessages.length}
                    totalCount={messages.length}
                  />

                  {/* Error banner */}
                  {error && !sendError && (
                    <div className="px-4 py-2 bg-red-900/30 text-red-400 text-sm flex-shrink-0">
                      {error}
                    </div>
                  )}

                  {/* Send error banner — dismissable */}
                  {sendError && (
                    <div className="px-4 py-2 bg-red-900/30 text-red-400 text-sm flex-shrink-0 flex items-center justify-between">
                      <span>Message failed: {sendError}</span>
                      <button
                        onClick={clearSendError}
                        className="text-red-300 hover:text-white text-xs ml-3 flex-shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Farcaster Messages */}
                  <MessageList
                    messages={filteredMessages}
                    isAdmin={user.isAdmin}
                    currentFid={user.fid}
                    hasSigner={hasSigner}
                    onHide={hideMessage}
                    onOpenThread={(hash) => setSelectedThreadHash(hash)}
                    onQuote={(cast) => {
                      setQuotedCast(cast);
                      setSelectedThreadHash(null);
                    }}
                    onOpenProfile={(fid) => setProfileFid(fid)}
                    onReply={(hash, authorName, text) => {
                      setReplyTo({ hash, authorName, text });
                      setQuotedCast(null);
                      composeRef.current?.focus();
                    }}
                    loading={loading}
                    channelId={activeChannel}
                    sortMode={sortMode}
                    onLoadMore={loadMore}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                  />

                  {/* Signer connect or Compose */}
                  {!hasSigner ? (
                    <div>
                      <SignerConnect onSuccess={refetch} />
                      <ComposeBar
                        ref={composeRef}
                        hasSigner={false}
                        onSend={sendMessage}
                        channel={activeChannel}
                      />
                    </div>
                  ) : (
                    <ComposeBar
                      ref={composeRef}
                      hasSigner={true}
                      onSend={sendMessage}
                      sending={sending}
                      channel={activeChannel}
                      quotedCast={quotedCast}
                      onClearQuote={() => setQuotedCast(null)}
                      onSchedule={() => setScheduleOpen(true)}
                      replyTo={replyTo}
                      onClearReply={() => setReplyTo(null)}
                    />
                  )}
                </>
              )}
            </>
        </div>
      </div>

      {/* Song Submit Panel */}
      <SongSubmit
        channel={activeChannel}
        isOpen={songSubmitOpen}
        onClose={() => setSongSubmitOpen(false)}
      />

      {/* Search Dialog */}
      <SearchDialog
        channel={activeChannel}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenThread={(hash) => {
          setSelectedThreadHash(hash);
          setSearchOpen(false);
        }}
      />

      {/* Scheduled Posts Panel */}
      <SchedulePanel
        channel={activeChannel}
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
      />

      {/* Thread Drawer — fixed overlay, z-50 */}
      {selectedThreadHash && (
        <ThreadDrawer
          threadHash={selectedThreadHash}
          isAdmin={user.isAdmin}
          hasSigner={hasSigner}
          currentFid={user.fid}
          onHide={hideMessage}
          onSend={sendMessage}
          onClose={() => setSelectedThreadHash(null)}
        />
      )}

      {/* FAQ Panel */}
      <FaqPanel isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
      <EmpirePanel isOpen={empireOpen} onClose={() => setEmpireOpen(false)} />

      {/* Tutorial Panel */}
      <TutorialPanel isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {/* Profile Drawer */}
      <ProfileDrawer
        fid={profileFid}
        onClose={() => setProfileFid(null)}
      />
    </div>
  );
}
