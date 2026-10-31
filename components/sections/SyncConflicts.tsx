'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/offline/api-fetch';
import {
  announceOfflineData, dismissConflict, getConflicts, getOfflineVersion, markConflictsSeen,
  subscribeOffline, type SyncConflict,
} from '@/lib/offline/store';

// Edits replaced during a sync (docs/offline-editing-plan.md §5): the field
// both devices changed went to the later edit, and the other value is kept
// here so it can be put back. Shown at the top of Logs for this trip.

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fieldName(field: string): string {
  return field.replace(/_/g, ' ');
}

export function SyncConflicts({ tripId }: { tripId: string }) {
  const version = useSyncExternalStore(subscribeOffline, getOfflineVersion, () => -1);
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  // Opening Logs counts as having seen them.
  useEffect(() => { markConflictsSeen(); }, []);

  if (version === -1) return null;
  const conflicts = getConflicts().filter((c) => c.tripId === tripId);
  if (conflicts.length === 0) return null;

  async function restore(c: SyncConflict) {
    setBusy(c.id);
    try {
      const res = c.field
        ? await apiFetch(`/api/${c.collection}/${c.recordId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [c.field]: c.replaced }),
          })
        : await apiFetch(`/api/trips/${c.tripId}/${c.collection}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c.replaced),
          });
      if (!res.ok) throw new Error();
      dismissConflict(c.id);
      announceOfflineData();
      toast.show('Restored', 'success');
    } catch {
      toast.show('Could not restore. Please try again.', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px', background: 'var(--bg2)' }}>
      <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--navy)' }}>Sync conflicts</h3>
      <p style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: 1.5, color: 'var(--text2)' }}>
        The same detail was changed on two devices. The later edit was kept; the other value is below.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {conflicts.map((c) => (
          <div key={c.id} style={{ borderTop: '1px solid var(--border2)', paddingTop: '10px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0, fontSize: '15px', lineHeight: 1.45, color: 'var(--text)' }}>
              <div style={{ fontWeight: 600 }}>{c.label}</div>
              {c.field ? (
                <div>
                  {fieldName(c.field)}: kept <strong>{show(c.kept)}</strong>, replaced <strong>{show(c.replaced)}</strong>
                </div>
              ) : (
                <div>Deleted on another device while you edited it here. Your edit was not applied.</div>
              )}
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{new Date(c.at).toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" loading={busy === c.id} onClick={() => void restore(c)}>
                {c.field ? 'Use replaced value' : 'Recreate'}
              </Button>
              <Button variant="ghost" onClick={() => dismissConflict(c.id)}>Dismiss</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
