'use client';

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { confirmOnline, isOnline, setOnline, subscribeOnline } from '@/lib/offline/status';

// Polls once (OfflineGuard calls this; nothing else should) and keeps the
// shared flag in lib/offline/status.ts current.
export function useOnlineStatus(): boolean {
  useEffect(() => {
    // The browser saying offline is final; confirmOnline() treats it so. The
    // server check can't overrule it: on localhost the server is the Mac.
    function goOffline() { setOnline(false); }
    function check() { void confirmOnline(); }

    check(); // immediate on mount
    const interval = setInterval(check, 10_000);
    window.addEventListener('online', check);
    window.addEventListener('offline', goOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', check);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return useSyncExternalStore(subscribeOnline, isOnline, () => true);
}

// The one status, polled once by OfflineGuard in the root layout. Components
// read it with useIsOnline() instead of starting their own poll.
export const OnlineStatusContext = createContext(true);

export function useIsOnline(): boolean {
  return useContext(OnlineStatusContext);
}
