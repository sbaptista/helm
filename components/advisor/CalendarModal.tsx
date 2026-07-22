'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export type GCalState = 'loading' | 'unconnected' | 'calendar_missing' | 'connected' | 'update_required';

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
  errors?: number;
  status?: 'success' | 'error';
  error?: string;
  success?: boolean;
}

interface WritableCalendar {
  id: string;
  summary: string;
  primary: boolean;
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
  const [writableCalendars, setWritableCalendars] = useState<WritableCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [calendarActionBusy, setCalendarActionBusy] = useState(false);
  const [calendarActionError, setCalendarActionError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | 'clear' | 'disconnect'>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [progressStats, setProgressStats] = useState({ creates: 0, updates: 0, deletes: 0, errors: 0 });
  const [progressDone, setProgressDone] = useState(false);
  const [progressError, setProgressError] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const fetchStatus = useCallback(async (validate = false) => {
    try {
      const res = await fetch(`/api/gcal/status/${tripId}${validate ? '?validate=true' : ''}`);
      const data = await res.json();
      if (!res.ok || !data.state) throw new Error(data.error ?? 'Failed to get calendar status');
      setStatus(data);
      onStatusChange?.(data.state);
      return data as GCalStatus;
    } catch {
      setStatus({ state: 'unconnected' });
      onStatusChange?.('unconnected');
      return null;
    }
  }, [tripId, onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!open) return;
    setStatus(current => ({ ...current, state: 'loading' }));
    void fetchStatus(true);
  }, [open, fetchStatus]);

  useEffect(() => {
    if (!open || status.state !== 'calendar_missing') return;
    setCalendarActionError('');
    fetch('/api/gcal/calendar')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Could not load Google calendars.');
        const calendars = (data.calendars ?? []) as WritableCalendar[];
        setWritableCalendars(calendars);
        setSelectedCalendarId(calendars[0]?.id ?? '');
      })
      .catch(error => setCalendarActionError(error instanceof Error ? error.message : 'Could not load Google calendars.'));
  }, [open, status.state]);

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
    const handler = () => { void fetchStatus(); };
    window.addEventListener('gcal:dirty', handler);
    return () => window.removeEventListener('gcal:dirty', handler);
  }, [fetchStatus]);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- OAuth callback must be consumed once

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
    setProgressStats({ creates: 0, updates: 0, deletes: 0, errors: 0 });
    setProgressDone(false);
    setProgressError(false);
    setProgressOpen(true);
    onOpenChange(false);

    try {
      const res = await fetch(`/api/gcal/push/trip/${tripId}`, { method: 'POST' });
      if (!res.ok) {
        let message = 'Server error — could not sync calendar.';
        try {
          const data = await res.json();
          message = data.message ?? data.error ?? message;
          if (data.error === 'calendar_missing') {
            setStatus(current => ({ ...current, state: 'calendar_missing' }));
            onStatusChange?.('calendar_missing');
          }
        } catch {}
        setProgressLog([`❌ ${message}`]);
        setProgressError(true);
        setProgressDone(true);
        return;
      }
      if (!res.body) throw new Error('Calendar sync returned no response.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let receivedComplete = false;
      let buffer = '';

      const confirmServerCompletion = async () => {
        const latest = await fetchStatus();
        if (latest?.state === 'connected') {
          receivedComplete = true;
          setProgressError(false);
          setProgressDone(true);
          setProgressLog(lines => [...lines, '✅ Server confirmed calendar sync complete.']);
          return true;
        }
        return false;
      };

      const readWithTimeout = () => new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Calendar sync response timed out.')), 30_000);
        reader.read().then(
          result => { window.clearTimeout(timeout); resolve(result); },
          error => { window.clearTimeout(timeout); reject(error); },
        );
      });

      const processEventBlock = (block: string) => {
        const lines = block.split(/\r?\n/).filter(line => line.startsWith('data: '));
        for (const line of lines) {
          try {
            const payload: SSEPayload = JSON.parse(line.slice('data: '.length));
            if (payload.type === 'progress') {
              if (payload.current !== undefined) setProgressCurrent(payload.current);
              if (payload.total !== undefined) setProgressTotal(payload.total);
              if (payload.label && payload.action) {
                const icon = payload.action === 'create' ? '➕' : payload.action === 'update' ? '✏️' : '🗑️';
                const result = payload.status === 'error' ? `❌ ${payload.error ?? 'Failed'}` : '✅';
                setProgressLog(entries => [...entries, `${icon} ${payload.label}… ${result}`]);
              }
            } else if (payload.type === 'stats') {
              setProgressStats({
                creates: payload.creates ?? 0,
                updates: payload.updates ?? 0,
                deletes: payload.deletes ?? 0,
                errors: payload.errors ?? 0,
              });
            } else if (payload.type === 'complete') {
              receivedComplete = true;
              const failed = payload.success !== true;
              setProgressError(failed);
              if (failed && payload.error) {
                setProgressLog(entries => [...entries, `❌ ${payload.error}`]);
              }
              setProgressDone(true);
              void fetchStatus();
            }
          } catch {}
        }
      };

      while (true) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await readWithTimeout();
        } catch (error) {
          await reader.cancel();
          if (await confirmServerCompletion()) break;
          throw error;
        }
        const { done, value } = readResult;
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? '';
        blocks.forEach(processEventBlock);
      }
      buffer += decoder.decode();
      if (buffer.trim()) processEventBlock(buffer);
      if (!receivedComplete) {
        if (!(await confirmServerCompletion())) {
          setProgressLog(lines => [...lines, '❌ Calendar sync ended before completion.']);
          setProgressError(true);
          setProgressDone(true);
        }
      }
    } catch (error) {
      setProgressLog(lines => [...lines, `❌ ${error instanceof Error ? error.message : 'Calendar sync failed.'}`]);
      setProgressError(true);
      setProgressDone(true);
    }
  };

  const linkCalendar = async (payload: { calendarId?: string; calendarName?: string }) => {
    setCalendarActionBusy(true);
    setCalendarActionError('');
    try {
      const response = await fetch('/api/gcal/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not link Google Calendar.');
      await fetchStatus(true);
    } catch (error) {
      setCalendarActionError(error instanceof Error ? error.message : 'Could not link Google Calendar.');
    } finally {
      setCalendarActionBusy(false);
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
      {status.state === 'loading' && (
        <Modal open={open} onClose={() => onOpenChange(false)}>
          <ModalHeader title="Google Calendar" onClose={() => onOpenChange(false)} />
          <ModalBody>
            <div style={{ minHeight: '88px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Lato', sans-serif", color: 'var(--text3)' }}>
              Checking the linked calendar…
            </div>
          </ModalBody>
        </Modal>
      )}

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

      {status.state === 'calendar_missing' && (
        <Modal open={open} onClose={() => onOpenChange(false)}>
          <ModalHeader title="Reconnect Google Calendar" onClose={() => onOpenChange(false)} />
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Lato', sans-serif" }}>
              <div style={{ padding: '14px 16px', borderRadius: 'var(--r)', background: 'rgba(139,32,32,0.06)', border: '1px solid rgba(139,32,32,0.2)', color: 'var(--text2)', fontSize: '14px', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--red)' }}>{status.calendarName ?? 'The linked calendar'} is no longer available in Google Calendar.</strong>
                {' '}Choose another calendar or create a replacement. Helm will rebuild only the items marked for Calendar inclusion.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="gcal-existing-calendar" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text2)' }}>
                  Use an existing calendar
                </label>
                <select
                  id="gcal-existing-calendar"
                  value={selectedCalendarId}
                  onChange={event => setSelectedCalendarId(event.target.value)}
                  style={{ ...inputStyle, minHeight: '44px' }}
                  disabled={calendarActionBusy || writableCalendars.length === 0}
                >
                  {writableCalendars.length === 0 && <option value="">No writable calendars found</option>}
                  {writableCalendars.map(calendar => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}{calendar.primary ? ' (Primary)' : ''}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  disabled={calendarActionBusy || !selectedCalendarId}
                  onClick={() => void linkCalendar({ calendarId: selectedCalendarId })}
                >
                  Use Selected Calendar
                </Button>
              </div>

              <div style={{ borderTop: '1px solid var(--border2)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="gcal-new-calendar" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text2)' }}>
                  Or create a new calendar
                </label>
                <input
                  id="gcal-new-calendar"
                  type="text"
                  value={calendarNameInput}
                  onChange={event => setCalendarNameInput(event.target.value)}
                  style={{ ...inputStyle, minHeight: '44px' }}
                  disabled={calendarActionBusy}
                />
                <Button
                  variant="primary"
                  disabled={calendarActionBusy || !calendarNameInput.trim()}
                  onClick={() => void linkCalendar({ calendarName: calendarNameInput.trim() })}
                >
                  Create New Calendar
                </Button>
              </div>

              {calendarActionError && (
                <div role="alert" style={{ color: 'var(--red)', fontSize: '13px' }}>{calendarActionError}</div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
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
      <Modal open={progressOpen} onClose={progressDone ? () => setProgressOpen(false) : () => {}}>
        <ModalHeader
          title={progressDone ? (progressError ? 'Sync Failed' : 'Calendar Up to Date') : 'Syncing Calendar…'}
          onClose={progressDone ? () => setProgressOpen(false) : () => {}}
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
              {progressDone && !progressError && (
                <div style={{ color: 'var(--gold-text)', fontWeight: 700 }}>✅ Calendar up to date</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              {(['creates', 'updates', 'deletes', 'errors'] as const).map(k => (
                <div key={k} style={{ background: 'var(--bg2)', borderRadius: 'var(--r)', padding: '10px', fontFamily: "'Lato', sans-serif" }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: k === 'errors' && progressStats.errors > 0 ? 'var(--red)' : 'var(--navy)' }}>
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
