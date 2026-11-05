'use client';

import { useEffect, useState } from 'react';
import { isOnline } from '@/lib/offline/status';
import { hasSnapshot, opsFor, readRecord, rememberTrips, subscribeOffline } from '@/lib/offline/store';

type TripLike = { id: string; title: string; destination: string | null };
type Shown = Record<string, { title: string; destination: string | null }>;

// Trip titles and destinations as this device knows them
// (docs/edit-trip-in-trip-plan.md), like useOfflineList for the sections:
// - Keeps the device copy current from what the server rendered.
// - Shows a title or destination edited offline, over a page loaded while
//   offline or before the sync finished.
// - Redraws after an edit, a sync or a discarded change.
export function useDeviceTrips<T extends TripLike>(trips: T[]): T[] {
  const [shown, setShown] = useState<Shown>({});
  const key = trips.map((t) => `${t.id}|${t.title}|${t.destination ?? ''}`).join('\n');

  useEffect(() => {
    // New server values: show them unless this device knows better.
    setShown({});

    // Online, the server's values are current; offline, the page may be an
    // older saved copy, so only use it when the device has nothing better.
    rememberTrips(isOnline() ? trips : trips.filter((t) => !hasSnapshot('trips', t.id)));

    function apply(always: boolean) {
      const next: Shown = {};
      for (const t of trips) {
        if (!always && isOnline() && opsFor('trips', t.id).length === 0) continue;
        const kept = readRecord('trips', t.id, t.id);
        if (!kept) continue;
        const title = typeof kept.title === 'string' ? kept.title : t.title;
        const destination = typeof kept.destination === 'string' || kept.destination === null ? kept.destination as string | null : t.destination;
        if (title !== t.title || destination !== t.destination) next[t.id] = { title, destination };
      }
      setShown(next);
    }

    apply(false);
    // An edit or a sync changes the device copy: show what it now has.
    const onData = () => apply(true);
    const unsubscribe = subscribeOffline(onData);
    window.addEventListener('helm:offline-data', onData);
    return () => {
      unsubscribe();
      window.removeEventListener('helm:offline-data', onData);
    };
    // `key` stands for `trips`: the same trips with the same values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return trips.map((t) => (shown[t.id] ? { ...t, ...shown[t.id] } : t));
}

export function useDeviceTrip<T extends TripLike>(trip: T): T {
  return useDeviceTrips([trip])[0];
}
