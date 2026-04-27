'use client';

import { useEffect } from 'react';

export default function ServiceWorkerKiller() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()));
    }
  }, []);

  return null;
}
