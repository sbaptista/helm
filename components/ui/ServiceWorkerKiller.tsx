'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const r of registrations) r.unregister();
      });
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
