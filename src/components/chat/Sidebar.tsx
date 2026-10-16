'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { communityConfig } from '@/../community.config';
import { useEscapeClose } from '@/hooks/useEscapeClose';
import { timeAgoCompact as timeAgo } from '@/lib/format/timeAgo';
import type { SessionData } from '@/types';

const CHANNELS = communityConfig.farcaster.channels.map((id) => ({ id, label: `# ${id}` }));

function lastSeen(isoDate: string | null): string {
  if (!isoDate) return '';
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 300) return 'Active now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Collapsible section ──────────────────────────────────────────────────────

function SidebarSection({
  title,
  badge,
  actions,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="px-3 mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 group"
      >
        <div className="flex items-center gap-1.5">
          <svg
            className={`w-2.5 h-2.5 text-gray-600 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
            {title}
          </span>
          {badge}
        </div>
        {actions && (
          <div onClick={(e) => e.stopPropagation()} className="flex gap-1">
            {actions}
          </div>
        )}
      </button>
      {open && <div className="space-y-0.5 pb-1">{children}</div>}
    </div>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────────────

interface SidebarProps {
  user: SessionData;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  activeChannel: string;
  onChannelSelect: (channel: string) => void;
  isTrending?: boolean;
  onTrendingSelect?: () => void;
  onOpenFaq?: () => void;
  onOpenTutorial?: () => void;
  onOpenEmpire?: () => void;
}

export function Sidebar({
  user,
  isOpen,
  onClose,
  onLogout,
  activeChannel,
  onChannelSelect,
  isTrending,
  onTrendingSelect,
  onOpenFaq,
  onOpenTutorial,
  onOpenEmpire,
}: SidebarProps) {
  useEscapeClose(onClose, isOpen);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} />}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-[#0d1b2a] border-r border-white/[0.08] z-50
          flex flex-col transition-transform duration-200 overflow-y-auto overflow-x-hidden
          md:translate-x-0 md:static md:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/[0.08] flex-shrink-0">
          <h1 className="text-xl font-bold text-[#f5a623] tracking-wide">THE ZAO</h1>
          <p className="text-xs text-gray-500 mt-1">Community on Farcaster</p>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto py-1">
          {/* ── Channels ──────────────────────────────────────────────── */}
          <SidebarSection title="Farcaster Channels">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => onChannelSelect(ch.id)}
                className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  activeChannel === ch.id && !isTrending
                    ? 'bg-[#f5a623]/10 text-[#f5a623] font-medium'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {ch.label}
              </button>
            ))}
            {/* Trending — powered by Sopha */}
            {onTrendingSelect && (
              <button
                onClick={onTrendingSelect}
                className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isTrending
                    ? 'bg-amber-500/10 text-amber-400 font-medium'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                🔥 Trending
              </button>
            )}
          </SidebarSection>

          {/* ── Pages ──────────────────────────────────────────────────── */}
          <SidebarSection title="Pages">
            {onOpenEmpire && (
              <button
                onClick={() => {
                  onOpenEmpire();
                  onClose();
                }}
                className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  activeChannel === 'zabal'
                    ? 'bg-[#f5a623]/10 text-[#f5a623] hover:bg-[#f5a623]/15'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 21V8.25l9-5.25 9 5.25V21M9 21V12h6v9M3 21h18"
                  />
                </svg>
                ZABAL Empire
                {activeChannel === 'zabal' && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider text-[#f5a623]/70">
                    live
                  </span>
                )}
              </button>
            )}
          </SidebarSection>

          {/* ── Help ────────────────────────────────────────────────────── */}
          <SidebarSection title="Help" defaultOpen={false}>
            <button
              onClick={onOpenTutorial}
              className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md text-gray-400 hover:bg-white/5 hover:text-white text-sm transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
                />
              </svg>
              Getting Started
            </button>
            <button
              onClick={onOpenFaq}
              className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md text-gray-400 hover:bg-white/5 hover:text-white text-sm transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
              FAQ
            </button>
          </SidebarSection>
        </div>

        {/* ── User footer ──────────────────────────────────────────────── */}
        <div className="p-3 border-t border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3">
            {user.pfpUrl ? (
              <div className="w-8 h-8 relative flex-shrink-0">
                <Image
                  src={user.pfpUrl}
                  alt={user.displayName}
                  fill
                  className="rounded-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-gray-400 font-medium">
                  {user.displayName?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-gray-500 truncate">@{user.username}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-xs text-gray-500 hover:text-white transition-colors flex-shrink-0"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
