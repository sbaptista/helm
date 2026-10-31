'use client';

import { useEffect } from 'react';
import { useIsOnline } from '@/hooks/useOnlineStatus';

// Asks the service worker (public/sw.js) to refresh its offline copies of
// these pages: on mount, when the app is shown or hidden, and on reconnect.
// The service worker skips pages it cached in the last two minutes.
export function useOfflineWarmup(paths: string[]) {
  const isOnline = useIsOnline();
  const key = paths.join('\n');

  useEffect(() => {
    if (!isOnline || !('serviceWorker' in navigator)) return;
    const list = key ? key.split('\n') : [];
    if (list.length === 0) return;

    function warm() {
      navigator.serviceWorker.controller?.postMessage({ type: 'warm', paths: list });
    }

    warm();
    document.addEventListener('visibilitychange', warm);
    return () => document.removeEventListener('visibilitychange', warm);
  }, [key, isOnline]);
}
