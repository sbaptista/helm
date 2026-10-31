'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOnlineStatus, OnlineStatusContext } from '@/hooks/useOnlineStatus';
import { flushOutbox } from '@/lib/offline/sync';
import { getOutbox } from '@/lib/offline/store';
import OfflinePage from '@/components/ui/OfflinePage';
import OfflinePill from '@/components/ui/OfflinePill';

// Pages that work offline from the service worker's saved copy
// (public/sw.js) and the device copy of the records (lib/offline/).
// Every other page shows the full offline page.
const OFFLINE_READABLE = [/^\/advisor\/dashboard\/?$/, /^\/advisor\/trips\/[^/]+\/?$/];

export function OfflineGuard({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();
  const router = useRouter();
  const wasOffline = useRef(false);

  // Back online: send waiting changes, then replace the saved page with
  // current data.
  useEffect(() => {
    if (!isOnline) { wasOffline.current = true; return; }
    const reconnected = wasOffline.current;
    wasOffline.current = false;
    if (!reconnected && getOutbox().length === 0) return;
    let cancelled = false;
    void flushOutbox().then(() => {
      if (!cancelled && reconnected) router.refresh();
    });
    return () => { cancelled = true; };
  }, [isOnline, router]);

  // Opened or brought to the front with changes still waiting: send them.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && getOutbox().length > 0) void flushOutbox();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const readable = OFFLINE_READABLE.some((r) => r.test(pathname));
  if (!isOnline && !readable) return <OfflinePage />;

  return (
    <OnlineStatusContext.Provider value={isOnline}>
      {children}
      <OfflinePill />
    </OnlineStatusContext.Provider>
  );
}
