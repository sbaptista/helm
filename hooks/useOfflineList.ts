'use client';

import { useEffect } from 'react';
import { parseApiUrl, type OfflineRecord } from '@/lib/offline/collections';
import { isOnline } from '@/lib/offline/status';
import { hasSnapshot, opsFor, readList, setSnapshot } from '@/lib/offline/store';

// Connects a section's list to the device copy (docs/offline-editing-plan.md
// §1). `url` is the list's API URL (/api/trips/{tripId}/{collection}),
// `serverItems` the list the server rendered, and `setItems` the section's
// state setter.
// - Keeps the device copy current from what the server rendered.
// - Shows changes still waiting to be sent, over a page loaded while offline
//   or before the sync finished.
// - Redraws the list after a sync or a discarded change.
// `seed` is false when serverItems is only part of the list (a section in
// form-only mode, opened from the Itinerary for one record).
export function useOfflineList<T>(url: string, serverItems: T[], setItems: (items: T[]) => void, seed = true) {
  useEffect(() => {
    const target = parseApiUrl(url);
    if (!seed || target?.kind !== 'list') return;
    const { collection, tripId } = target;
    // Online, the server's list is current; offline, it may be an older saved
    // page, so only use it when the device has nothing better.
    if (isOnline() ? opsFor(collection, tripId).length === 0 : !hasSnapshot(collection, tripId)) {
      setSnapshot(collection, tripId, serverItems as unknown as OfflineRecord[]);
    }
  }, [url, serverItems, seed]);

  useEffect(() => {
    const target = parseApiUrl(url);
    if (target?.kind !== 'list') return;
    const { collection, tripId } = target;

    function apply() {
      const list = readList(collection, tripId);
      if (list) setItems(list as unknown as T[]);
    }

    if (!isOnline() || opsFor(collection, tripId).length > 0) apply();
    window.addEventListener('helm:offline-data', apply);
    return () => window.removeEventListener('helm:offline-data', apply);
    // setItems is a state setter (stable); including it would re-run on every render
    // when a section passes a wrapper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
}
