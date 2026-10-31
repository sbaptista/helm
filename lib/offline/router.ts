'use client';

import { useMemo } from 'react';
import { useRouter as useNextRouter } from 'next/navigation';
import { isOnline } from '@/lib/offline/status';

// next/navigation's useRouter, except refresh() does nothing while offline.
// Offline, Next turns a failed refresh into a full page reload, which would
// throw away what's on screen. OfflineGuard refreshes once back online.
export function useRouter() {
  const router = useNextRouter();
  return useMemo(() => ({
    ...router,
    refresh: () => {
      if (isOnline()) router.refresh();
    },
  }), [router]);
}
