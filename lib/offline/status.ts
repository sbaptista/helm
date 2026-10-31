'use client';

// One online/offline flag for the whole app. OfflineGuard's poll
// (hooks/useOnlineStatus.ts) sets it; apiFetch also sets it offline the
// moment a request can't reach the server, so a save made in the seconds
// before the next poll is queued rather than lost.

// Starts from the browser's own report, so a page opened offline doesn't
// briefly treat its saved copy as current server data.
let online = typeof navigator === 'undefined' ? true : navigator.onLine;
const listeners = new Set<() => void>();

export function isOnline(): boolean {
  return online;
}

export function setOnline(value: boolean): void {
  if (online === value) return;
  online = value;
  listeners.forEach((l) => l());
}

export function subscribeOnline(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// Asks the server directly. In development /api/health also checks that the
// server can reach Supabase, so a 500 from a save with Wi-Fi off on the Mac
// is recognised as "offline", not as a failed save.
export async function confirmOnline(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setOnline(false);
    return false;
  }
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    setOnline(res.ok);
    return res.ok;
  } catch {
    setOnline(false);
    return false;
  }
}
