'use client';

import { useState, useSyncExternalStore } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { useIsOnline } from '@/hooks/useOnlineStatus';
import {
  getOfflineVersion, getOutbox, getUnseenConflicts, isSyncing, markConflictsSeen,
  subscribeOffline,
} from '@/lib/offline/store';
import FailedChangesSheet from '@/components/ui/FailedChangesSheet';

// Sync state, like Apple Notes shows it: nothing when all is saved;
// otherwise offline, waiting changes, syncing, changes that couldn't be
// saved (tap for the list), or edits replaced by a later one (tap to dismiss;
// the details are in Logs). Kept narrow enough to clear the dashboard's
// mobile New Trip button.
export default function OfflinePill() {
  const isOnline = useIsOnline();
  // -1 while hydrating: the device copy lives in localStorage, which the
  // server render can't see.
  const version = useSyncExternalStore(subscribeOffline, getOfflineVersion, () => -1);
  const [sheetOpen, setSheetOpen] = useState(false);
  if (version === -1) return null;

  const outbox = getOutbox();
  const waiting = outbox.filter((o) => o.status === 'pending').length;
  const failed = outbox.length - waiting;
  const replaced = getUnseenConflicts();
  const syncing = isSyncing();

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  let content: { icon: React.ElementType; text: string; onTap?: () => void } | null = null;
  if (failed > 0) {
    content = { icon: AlertTriangle, text: `${plural(failed, 'change')} couldn't be saved`, onTap: () => setSheetOpen(true) };
  } else if (!isOnline) {
    content = { icon: WifiOff, text: waiting ? `Offline · ${plural(waiting, 'change')} waiting` : 'Offline' };
  } else if (syncing || waiting) {
    content = { icon: RefreshCw, text: waiting ? `Syncing ${plural(waiting, 'change')}…` : 'Syncing…' };
  } else if (replaced > 0) {
    content = { icon: Info, text: `${plural(replaced, 'edit')} replaced · see Logs`, onTap: markConflictsSeen };
  }

  return (
    <>
      {content && (
        <button
          type="button"
          role="status"
          onClick={content.onTap}
          disabled={!content.onTap}
          style={{
            position: 'fixed',
            bottom: 'calc(16px + var(--sab))',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 'calc(100vw - 176px)',
            minWidth: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minHeight: '44px',
            padding: '8px 18px',
            borderRadius: '22px',
            border: 'none',
            background: failed > 0 ? 'var(--action)' : 'var(--navy)',
            color: 'var(--cream)',
            boxShadow: 'var(--shadow-lg)',
            fontFamily: "'Lato', sans-serif",
            fontSize: '15px',
            fontWeight: 600,
            lineHeight: 1.25,
            textAlign: 'center',
            zIndex: 45,
            cursor: content.onTap ? 'pointer' : 'default',
            opacity: 1,
          }}
        >
          <content.icon size={18} style={{ flexShrink: 0, color: failed > 0 ? 'var(--cream)' : 'var(--gold2)' }} />
          <span>{content.text}</span>
        </button>
      )}
      <FailedChangesSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
