'use client';

import { useSyncExternalStore } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useIsOnline } from '@/hooks/useOnlineStatus';
import {
  announceOfflineData, getOfflineVersion, getOutbox, removeOp, retryFailed, setSnapshot,
  subscribeOffline,
} from '@/lib/offline/store';
import { unwrapList } from '@/lib/offline/collections';
import { flushOutbox } from '@/lib/offline/sync';

const ACTION = { POST: 'Add', PATCH: 'Change', DELETE: 'Delete' } as const;

// Changes the server refused when they were sent. Nothing is dropped
// silently: each one stays until it is retried or discarded here.
export default function FailedChangesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isOnline = useIsOnline();
  useSyncExternalStore(subscribeOffline, getOfflineVersion, () => 0);
  const failed = getOutbox().filter((o) => o.status === 'failed');

  async function discard(opId: string) {
    const op = failed.find((o) => o.id === opId);
    removeOp(opId);
    // Put the list back to what the server has.
    if (op && isOnline) {
      try {
        const res = await fetch(`/api/trips/${op.tripId}/${op.collection}`, { cache: 'no-store' });
        const records = res.ok ? unwrapList(op.collection, await res.json()) : null;
        if (records) setSnapshot(op.collection, op.tripId, records);
      } catch {}
    }
    announceOfflineData();
    if (getOutbox().every((o) => o.status !== 'failed')) onClose();
  }

  function retry() {
    retryFailed();
    void flushOutbox();
    onClose();
  }

  return (
    <Modal open={open && failed.length > 0} onClose={onClose}>
      <ModalHeader title="Changes not saved" onClose={onClose} />
      <ModalBody>
        <p style={{ margin: '0 0 16px', fontSize: '16px', lineHeight: 1.5, color: 'var(--text2)' }}>
          These changes were made on this device but the server didn&apos;t accept them.
          They still show in Helm on this device only. Try again, or discard a change to go
          back to the saved version.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {failed.map((op) => (
            <div key={op.id} style={{ border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                  {ACTION[op.method]}: {op.label}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '4px' }}>
                  {new Date(op.at).toLocaleString()} · {op.error}
                </div>
              </div>
              <Button variant="ghost" onClick={() => void discard(op.id)}>Discard</Button>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={retry} disabled={!isOnline}>Try again</Button>
      </ModalFooter>
    </Modal>
  );
}
