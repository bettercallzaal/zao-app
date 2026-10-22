'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SessionData } from '@/types';
import { endBrowserSession } from '@/lib/auth/client-logout';

export function useAuth() {
  const [user, setUser] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = useCallback(async () => {
    try {
      await endBrowserSession();
    } catch {
      window.alert('Sign out failed. Please try again.');
      return;
    }
    setUser(null);
    window.location.href = '/';
  }, []);

  return { user, loading, logout, refetch: fetchSession };
}
