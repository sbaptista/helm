'use client';

import { useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { inputStyle, inputFocusStyle } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/offline/api-fetch';
import { useRouter } from '@/lib/offline/router';

// Edit Trip: title and destination, from the dashboard or inside the trip
// (docs/edit-trip-in-trip-plan.md). Saves through apiFetch, so it also works
// offline: the change waits on the device and is sent when Helm is online.

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '6px',
  fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700,
  color: 'var(--text2)', letterSpacing: '0.04em', textTransform: 'uppercase',
};

export function EditTripModal({
  open,
  onClose,
  trip,
}: {
  open: boolean;
  onClose: () => void;
  trip: { id: string; title: string; destination: string | null } | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from the trip's current values each time the window opens.
  useEffect(() => {
    if (!open || !trip) return;
    setTitle(trip.title);
    setDestination(trip.destination ?? '');
    setTitleTouched(false);
    setError(null);
  }, [open, trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const titleMissing = titleTouched && !title.trim();

  function close() {
    if (!saving) onClose();
  }

  async function save() {
    if (!trip || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), destination: destination.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Failed to save.');
      onClose();
      router.refresh(); // does nothing offline; the device copy shows the change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={close}>
      <ModalHeader title="Edit Trip" onClose={close} />
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={labelStyle}>
            Trip title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Canadian Rockies 2026"
              aria-invalid={titleMissing}
              style={inputStyle(titleMissing)}
              onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle(titleMissing))}
              onBlur={(e) => {
                setTitleTouched(true);
                Object.assign(e.currentTarget.style, inputStyle(!e.currentTarget.value.trim()));
              }}
              disabled={saving}
            />
            {titleMissing && (
              <span style={{ fontSize: '13px', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--red)' }}>
                A trip needs a title.
              </span>
            )}
          </label>
          <label style={labelStyle}>
            Destination
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Banff and Jasper, Alberta"
              style={inputStyle()}
              onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle())}
              onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle())}
              disabled={saving}
            />
          </label>
          {error && (
            <p style={{ fontSize: '13px', color: 'var(--red)', fontFamily: "'Lato', sans-serif" }}>{error}</p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={close} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
