'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import OfflinePage from '@/components/ui/OfflinePage';

export function OfflineGuard({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  if (!isOnline) return <OfflinePage />;
  return <>{children}</>;
}
