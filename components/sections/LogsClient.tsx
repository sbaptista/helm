'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import LevelBadge from '@/components/ui/LevelBadge';
import { useToast } from '@/components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  trip_id: string | null;
  level: 'WARN' | 'ERROR' | 'CRITICAL' | 'FATAL';
  source: string;
  message: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LogsClient({ tripId }: { tripId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [clearDays, setClearDays] = useState<number>(30);
  const [confirmMode, setConfirmMode] = useState<null | 'days' | 'all'>(null);
  const [clearing, setClearing] = useState(false);
  const toast = useToast();

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/logs`);
    if (res.ok) setLogs(await res.json());
  }, [tripId]);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const sources = ['ALL', ...Array.from(new Set(logs.map(l => l.source))).sort()];
  const levels = ['ALL', 'WARN', 'ERROR', 'CRITICAL', 'FATAL'];

  const filtered = logs.filter(l => {
    if (levelFilter !== 'ALL' && l.level !== levelFilter) return false;
    if (sourceFilter !== 'ALL' && l.source !== sourceFilter) return false;
    return true;
  });

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleClear() {
    setClearing(true);
    const url = confirmMode === 'all'
      ? `/api/trips/${tripId}/logs?all=true`
      : `/api/trips/${tripId}/logs?days=${clearDays}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      await refetch();
    } else {
      toast.error('Failed to clear logs.');
    }
    setClearing(false);
    setConfirmMode(null);
  }

  const selectStyle: React.CSSProperties = {
    fontFamily: "'Lato', sans-serif",
    fontSize: 'var(--fs-sm)',
    color: 'var(--text)',
    background: 'var(--bg2)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--r)',
    padding: '6px 10px',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Section title */}
      <h2 style={{
        fontSize: 'var(--fs-xl)',
        fontFamily: 'var(--font-display)',
        color: 'var(--navy)',
        fontWeight: 'var(--fw-normal)',
      }}>
        Logs
      </h2>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Filters — left */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={selectStyle}>
            {levels.map(l => (
              <option key={l} value={l}>{l === 'ALL' ? 'All Levels' : l}</option>
            ))}
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={selectStyle}>
            {sources.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Sources' : s}</option>
            ))}
          </select>
        </div>

        {/* Clear — right */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={clearDays}
            onChange={e => setClearDays(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <button
            type="button"
            onClick={() => setConfirmMode('days')}
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              fontWeight: 'var(--fw-medium)',
              color: 'var(--red)',
              background: 'none',
              border: '1px solid rgba(139,32,32,0.3)',
              borderRadius: 'var(--r)',
              padding: '6px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Clear Logs
          </button>
          <button
            type="button"
            onClick={() => setConfirmMode('all')}
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              fontWeight: 'var(--fw-medium)',
              color: 'var(--red)',
              background: 'rgba(139,32,32,0.06)',
              border: '1px solid rgba(139,32,32,0.4)',
              borderRadius: 'var(--r)',
              padding: '6px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Confirm inline */}
      {confirmMode && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(139,32,32,0.05)',
          border: '1px solid rgba(139,32,32,0.2)',
          borderRadius: 'var(--r)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--red)', flex: 1 }}>
            {confirmMode === 'all'
              ? 'Delete ALL logs? Every entry will be permanently removed. This cannot be undone.'
              : `Delete logs older than ${clearDays} days? This cannot be undone.`}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: 'var(--fs-sm)',
                fontWeight: 'var(--fw-bold)',
                color: 'var(--red)',
                background: 'none',
                border: 'none',
                cursor: clearing ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                opacity: clearing ? 0.5 : 1,
                minHeight: '44px',
                padding: '0 4px',
              }}
            >
              {clearing ? 'Clearing…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmMode(null)}
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: 'var(--fs-sm)',
                color: 'var(--text3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                minHeight: '44px',
                padding: '0 4px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading / empty states */}
      {loading && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '32px 0' }}>
          Loading logs…
        </p>
      )}
      {!loading && filtered.length === 0 && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text3)', textAlign: 'center', padding: '32px 0' }}>
          No logs found.
        </p>
      )}

      {/* Log list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filtered.map(log => {
            const isExpanded = expandedIds.has(log.id);
            return (
              <div
                key={log.id}
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border2)',
                  borderRadius: 'var(--r)',
                  overflow: 'hidden',
                }}
              >
                {/* Row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(log.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatTimestamp(log.created_at)}
                  </span>
                  <LevelBadge level={log.level} />
                  <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--slate)', flexShrink: 0 }}>
                    {log.source}
                  </span>
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-sm)', color: 'var(--text)', flex: 1, minWidth: '120px' }}>
                    {log.message}
                  </span>
                  <span style={{ color: 'var(--text3)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {/* Expanded payload */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid var(--border2)',
                    padding: '10px 14px',
                    background: 'var(--bg3)',
                  }}>
                    {log.payload ? (
                      <pre style={{
                        fontFamily: 'monospace',
                        fontSize: 'var(--fs-xs)',
                        color: 'var(--text2)',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}>
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    ) : (
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>
                        No payload.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
