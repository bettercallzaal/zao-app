'use client';

import { clearZaoOfflineCaches } from '@/lib/pwa/clear-caches';

export async function endBrowserSession(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
  if (!response.ok) throw new Error('Sign out failed. Please try again.');
  if (typeof window !== 'undefined') {
    try {
      await clearZaoOfflineCaches(window.caches);
    } catch {
      /* Storage may be disabled. New workers never cache private data. */
    }
  }
}
