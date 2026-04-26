'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type GCalState = 'loading' | 'unconnected' | 'connected' | 'update_required';

interface GCalStatus {
  state: GCalState;
  calendarName?: string;
  lastSyncedAt?: string | null;
  dirtyCount?: number;
}

interface SSEPayload {
  type: 'progress' | 'stats' | 'complete';
  current?: number;
  total?: number;
  label?: string;
  action?: 'create' | 'update' | 'delete';
  creates?: number;
  updates?: number;
  deletes?: number;
}

export type CalendarModalProps = {
  tripId: string;
  tripName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (status: GCalState) => void;
};

export function CalendarModal({ tripId, tripName, open, onOpenChange, onStatusChange }: CalendarModalProps) {
  const router = useRouter();

  const [status, setStatus] = useState<GCalStatus>({ state: 'loading' });
  const [isOffline, setIsOffline] = useState(
    typeof window !== 'undefined' ? !navigator.onLine : false
  );
  const [calendarNameInput, setCalendarNameInput] = useState(tripName);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | 'clear' | 'disconnect'>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [progressStats, setProgressStats] = useState({ creates: 0, updates: 0, deletes: 0 });
  const [progressDone, setProgressDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/gcal/status/${tripId}`);
      const data = await res.json();
      setStatus(data);
      onStatusChange?.(data.state);
    } catch {
      setStatus({ state: 'unconnected' });
      onStatusChange?.('unconnected');
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [tripId]);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  useEffect(() => {
    const handler = () => fetchStatus();
    window.addEventListener('gcal:dirty', handler);
    return () => window.removeEventListener('gcal:dirty', handler);
  }, []);

  // Handle post-OAuth return: ?gcal_connected=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal_connected') !== 'true') return;

    const pendingName = sessionStorage.getItem('gcal_pending_calendar_name') ?? tripName;
    sessionStorage.removeItem('gcal_pending_calendar_name');

    fetch('/api/gcal/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, calendarName: pendingName }),
    }).finally(() => {
      fetchStatus();
      const url = new URL(window.location.href);
      url.searchParams.delete('gcal_connected');
      router.replace(url.pathname + (url.search ? url.search : ''));
    });
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [progressLog]);

  const startSync = async () => {
    setProgressCurrent(0);
    setProgressTotal(0);
    setProgressLog([]);
    setProgressStats({ creates: 0, updates: 0, deletes: 0 });
    setProgressDone(false);
    setProgressOpen(true);
    onOpenChange(false);

    try {
      const res = await fetch(`/api/gcal/push/trip/${tripId}`, { method: 'POST' });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const payload: SSEPayload = JSON.parse(line.slice('data: '.length));
            if (payload.type === 'progress') {
              if (payload.current !== undefined) setProgressCurrent(payload.current);
              if (payload.total !== undefined) setProgressTotal(payload.total);
              if (payload.label && payload.action) {
                const icon = payload.action === 'create' ? '➕' : payload.action === 'update' ? '✏️' : '🗑️';
                setProgressLog(l => [...l, `${icon} ${payload.label}... ✅`]);
              }
            } else if (payload.type === 'stats') {
              setProgressStats({
                creates: payload.creates ?? 0,
                updates: payload.updates ?? 0,
                deletes: payload.deletes ?? 0,
              });
            } else if (payload.type === 'complete') {
              setProgressDone(true);
              fetchStatus();
            }
          } catch {}
        }
      }
    } catch {
      setProgressDone(true);
    }
  };

  const handleConnect = () => {
    sessionStorage.setItem('gcal_pending_calendar_name', calendarNameInput || tripName);
    window.location.href = `/api/gcal/auth?tripId=${tripId}`;
  };

  const handleRename = async () => {
    await fetch('/api/gcal/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, calendarName: renameValue }),
    });
    setRenaming(false);
    await fetchStatus();
  };

  const handleClear = async () => {
    await fetch('/api/gcal/calendar/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId }),
    });
    setConfirmAction(null);
    onOpenChange(false);
    await fetchStatus();
  };

  const handleDisconnect = async () => {
    await fetch('/api/gcal/auth', { method: 'DELETE' });
    setConfirmAction(null);
    onOpenChange(false);
    await fetchStatus();
  };

  const closeConnectedModal = () => {
    onOpenChange(false);
    setRenaming(false);
    setConfirmAction(null);
  };

  const formatLastSynced = (iso?: string | null) =>
    iso ? `Last updated ${new Date(iso).toLocaleString()}` : 'Never synced';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 12px',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--r)',
    fontFamily: "'Lato', sans-serif",
    fontSize: '14px',
    color: 'var(--text1)',
    background: 'var(--bg)',
  };

  const destructiveBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Lato', sans-serif",
    fontSize: '14px',
    color: 'var(--red)',
    textAlign: 'left',
    padding: '4px 0',
  };

  const confirmPanelStyle: React.CSSProperties = {
    background: 'rgba(139,32,32,0.06)',
    border: '1px solid rgba(139,32,32,0.2)',
    borderRadius: 'var(--r)',
    padding: '16px',
  };

  return (
    <>
      {/* State 1 — Unconnected modal */}
      {status.state === 'unconnected' && (
        <Modal open={open} onClose={() => onOpenChange(false)}>
          <ModalHeader title="Connect Google Calendar" onClose={() => onOpenChange(false)} />
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 600, color: 'var(--text2)' }}>
                Calendar name
                <input
                  type="text"
                  value={calendarNameInput}
                  onChange={e => setCalendarNameInput(e.target.value)}
                  placeholder={tripName}
                  style={inputStyle}
                />
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConnect} disabled={isOffline}>Connect Google Calendar</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* State 2 — Connected modal (also handles update_required modal-less path) */}
      {(status.state === 'connected' || status.state === 'update_required') && (
        <Modal open={open} onClose={closeConnectedModal}>
          <ModalHeader title="Google Calendar" onClose={closeConnectedModal} />
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Lato', sans-serif" }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>
                  {status.calendarName}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '4px' }}>
                  {formatLastSynced(status.lastSyncedAt)}
                </div>
              </div>

              {confirmAction === 'clear' ? (
                <div style={confirmPanelStyle}>
                  <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text2)' }}>
                    This will remove all events from Google Calendar and reset sync state. Are you sure?
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <button
                      onClick={handleClear}
                      style={{ padding: '8px 16px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: "'Lato', sans-serif", fontSize: '14px', fontWeight: 700 }}
                    >
                      Clear Calendar
                    </button>
                  </div>
                </div>
              ) : confirmAction === 'disconnect' ? (
                <div style={confirmPanelStyle}>
                  <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text2)' }}>
                    This will disconnect Google Calendar. Existing calendar events will not be deleted.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <button
                      onClick={handleDisconnect}
                      style={{ padding: '8px 16px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: "'Lato', sans-serif", fontSize: '14px', fontWeight: 700 }}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : renaming ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <Button variant="primary" onClick={handleRename}>Save</Button>
                  <Button variant="secondary" onClick={() => setRenaming(false)}>Cancel</Button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Button variant="primary" onClick={() => startSync()}>Update All</Button>
                  <Button variant="secondary" onClick={() => { setRenameValue(status.calendarName ?? ''); setRenaming(true); }}>
                    Rename Calendar
                  </Button>
                  <button style={destructiveBtnStyle} onClick={() => setConfirmAction('clear')}>
                    Clear Calendar
                  </button>
                  <button style={destructiveBtnStyle} onClick={() => setConfirmAction('disconnect')}>
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </ModalBody>
          {!confirmAction && !renaming && (
            <ModalFooter>
              <Button variant="secondary" onClick={closeConnectedModal}>Close</Button>
            </ModalFooter>
          )}
        </Modal>
      )}

      {/* Progress Modal */}
      <Modal open={progressOpen} onClose={() => {}}>
        <ModalHeader
          title={progressDone ? 'Calendar Up to Date' : 'Syncing Calendar…'}
          onClose={() => {}}
        />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--navy)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: 'var(--gold)',
                  width: progressDone
                    ? '100%'
                    : progressTotal > 0
                    ? `${Math.round((progressCurrent / progressTotal) * 100)}%`
                    : '0%',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            {progressTotal > 0 && (
              <div style={{ fontSize: '13px', color: 'var(--text3)', fontFamily: "'Lato', sans-serif", textAlign: 'center' }}>
                {progressCurrent} / {progressTotal}
              </div>
            )}

            <div
              ref={logRef}
              style={{ maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: '2px' }}
            >
              {progressLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {progressDone && (
                <div style={{ color: 'var(--gold-text)', fontWeight: 700 }}>✅ Calendar up to date</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
              {(['creates', 'updates', 'deletes'] as const).map(k => (
                <div key={k} style={{ background: 'var(--bg2)', borderRadius: 'var(--r)', padding: '10px', fontFamily: "'Lato', sans-serif" }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>
                    {progressStats[k]}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'capitalize' }}>
                    {k}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ModalBody>
        {progressDone && (
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={async () => {
                setProgressOpen(false);
                await fetchStatus();
              }}
            >
              Close
            </Button>
          </ModalFooter>
        )}
      </Modal>
    </>
  );
}
