'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { PersistentMessage } from '@/components/ui/PersistentMessage';
import { isSimulatedOffline, setSimulatedOffline } from '@/lib/offline/status';
import { DEV_IMPORT_ERROR_KEY, DEV_IMPORT_ERROR_CODES } from '@/lib/import/errors';

const VARIANT_KEY = 'helm-auth-variant';
const UPDATE_SIM_KEY = 'helm-dev-simulate-update';
const IMPORT_AI_ERROR_LABELS: Record<(typeof DEV_IMPORT_ERROR_CODES)[number], string> = {
  ai_credits: 'Credits',
  ai_busy: 'Busy',
  ai_not_configured: 'No key',
};

function DevDebugPanelInner() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [showCritical, setShowCritical] = useState(false);
  const [showFatal, setShowFatal] = useState(false);
  const [authVariant, setAuthVariant] = useState<'a' | 'b'>('a');
  const [simulateUpdate, setSimulateUpdate] = useState(false);
  const [simulateOffline, setSimulateOffline] = useState(false);
  // Import Document fails as the AI service would (docs/import-fix-plan.md Step 8).
  const [importAiError, setImportAiError] = useState<string>('');
  const [tzResults, setTzResults] = useState<string[] | null>(null);
  const [mapFill, setMapFill] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VARIANT_KEY);
    if (stored === 'b') setAuthVariant('b');
    setSimulateUpdate(localStorage.getItem(UPDATE_SIM_KEY) === 'true');
    setSimulateOffline(isSimulatedOffline());
    try { setImportAiError(localStorage.getItem(DEV_IMPORT_ERROR_KEY) ?? ''); } catch {}
  }, []);

  async function triggerError() {
    try {
      const res = await fetch('/api/__dev_error');
      if (!res.ok) throw new Error();
    } catch {
      toast.show('Something went wrong', 'error');
    }
  }

  // Checks the Google key without showing it (docs/timezone-lookup-plan.md).
  async function testTimezoneLookup() {
    setTzResults(['Looking up…']);
    const lines: string[] = [];
    for (const query of ['Ann Arbor, MI', 'Kyoto, Japan', 'NRT airport']) {
      try {
        const res = await fetch('/api/timezone/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const json = await res.json();
        lines.push(json.ok ? `✓ ${query} → ${json.timezone}` : `✗ ${query}: ${json.message ?? json.error ?? res.status}`);
      } catch (err) {
        lines.push(`✗ ${query}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setTzResults(lines);
  }

  // Map tile locations for records saved before version 3
  // (docs/links-and-map-tiles-plan.md §3).
  async function fillMapLocations() {
    setMapFill('Filling…');
    try {
      const res = await fetch('/api/dev/fill-map-locations', { method: 'POST' });
      const json = await res.json();
      setMapFill(res.ok
        ? [`Checked ${json.checked}: ${json.found} located${json.linked ? `, ${json.linked} links created` : ''}${json.failed ? `, ${json.failed} not saved` : ''}`, ...(json.notFound ?? [])].join('\n')
        : `✗ ${json.error ?? res.status}`);
    } catch (err) {
      setMapFill(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const btnStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '6px 10px',
    background: 'var(--bg2)',
    border: '1px solid var(--border2)',
    borderRadius: '4px',
    fontFamily: "'Lato', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text)',
    cursor: 'pointer',
    textAlign: 'left',
  };

  return (
    <>
      {showFatal && (
        <PersistentMessage variant="fatal" message="" onAction={() => setShowFatal(false)} />
      )}

      {showCritical && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          right: 0,
          zIndex: 9000,
          padding: '0 16px',
        }}>
          <PersistentMessage variant="critical" message="" onAction={() => setShowCritical(false)} />
        </div>,
        document.body
      )}

      <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 10000 }}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'block',
            marginLeft: 'auto',
            padding: '4px 10px',
            background: 'var(--action)',
            color: 'var(--action-text)',
            border: 'none',
            borderRadius: '4px',
            fontFamily: "'Lato', sans-serif",
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          DEV
        </button>

        {open && (
          <div style={{
            marginTop: '6px',
            padding: '10px',
            background: 'var(--bg)',
            border: '1px solid var(--border2)',
            borderRadius: '6px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '160px',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}>
            <button type="button" style={btnStyle} onClick={triggerError}>
              Trigger Error
            </button>
            {showCritical ? (
              <button type="button" style={{ ...btnStyle, color: 'var(--red)' }} onClick={() => setShowCritical(false)}>
                Clear Critical
              </button>
            ) : (
              <button type="button" style={btnStyle} onClick={() => setShowCritical(true)}>
                Trigger Critical
              </button>
            )}
            <button type="button" style={btnStyle} onClick={() => setShowFatal(v => !v)}>
              Trigger Fatal
            </button>

            {/* Auth shell variant */}
            <div style={{
              borderTop: '1px solid var(--border2)',
              paddingTop: '8px',
              marginTop: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Auth Shell
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['a', 'b'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      localStorage.setItem(VARIANT_KEY, v);
                      setAuthVariant(v);
                      window.dispatchEvent(new Event('auth-variant-change'));
                    }}
                    style={{
                      ...btnStyle,
                      textAlign: 'center',
                      flex: 1,
                      background: authVariant === v ? 'var(--action)' : 'var(--bg2)',
                      color: authVariant === v ? 'var(--action-text)' : 'var(--text)',
                    }}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Google timezone lookup */}
            <div style={{
              borderTop: '1px solid var(--border2)',
              paddingTop: '8px',
              marginTop: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              {/* Goes through the root ErrorBoundary (FatalErrorPage); offline
                  with Simulate Offline on, it shows "Connection lost". */}
              <button type="button" style={btnStyle} onClick={() => window.dispatchEvent(new Event('helm-dev-render-error'))}>
                Trigger Render Error
              </button>
              <button type="button" style={btnStyle} onClick={testTimezoneLookup}>
                Test timezone lookup
              </button>
              {tzResults && tzResults.map(line => (
                <span key={line} style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', color: 'var(--text2)', maxWidth: '260px', overflowWrap: 'anywhere' }}>
                  {line}
                </span>
              ))}
              <button type="button" style={btnStyle} onClick={fillMapLocations}>
                Fill map locations
              </button>
              {mapFill && (
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', color: 'var(--text2)', maxWidth: '260px', overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}>
                  {mapFill}
                </span>
              )}
            </div>

            {/* Import AI error simulation */}
            <div style={{
              borderTop: '1px solid var(--border2)',
              paddingTop: '8px',
              marginTop: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Import AI Error
              </span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {([['', 'Off'], ...DEV_IMPORT_ERROR_CODES.map((c) => [c, IMPORT_AI_ERROR_LABELS[c]])] as [string, string][]).map(([code, label]) => (
                  <button
                    key={code || 'off'}
                    type="button"
                    onClick={() => {
                      try {
                        if (code) localStorage.setItem(DEV_IMPORT_ERROR_KEY, code);
                        else localStorage.removeItem(DEV_IMPORT_ERROR_KEY);
                      } catch {}
                      setImportAiError(code);
                    }}
                    style={{
                      ...btnStyle,
                      textAlign: 'center',
                      flex: 1,
                      background: importAiError === code ? 'var(--action)' : 'var(--bg2)',
                      color: importAiError === code ? 'var(--action-text)' : 'var(--text)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Update simulation */}
            <div style={{
              borderTop: '1px solid var(--border2)',
              paddingTop: '8px',
              marginTop: '2px',
            }}>
              <button
                type="button"
                style={{
                  ...btnStyle,
                  background: simulateUpdate ? 'var(--action)' : 'var(--bg2)',
                  color: simulateUpdate ? 'var(--action-text)' : 'var(--text)',
                }}
                onClick={() => {
                  const next = !simulateUpdate;
                  setSimulateUpdate(next);
                  localStorage.setItem(UPDATE_SIM_KEY, String(next));
                  window.dispatchEvent(new Event('helm-dev-update-change'));
                }}
              >
                {simulateUpdate ? '✓ Update Simulated' : 'Simulate Update'}
              </button>
              {/* Helm acts offline (saves wait, outbox held) with the network up. */}
              <button
                type="button"
                style={{
                  ...btnStyle,
                  marginTop: '6px',
                  background: simulateOffline ? 'var(--action)' : 'var(--bg2)',
                  color: simulateOffline ? 'var(--action-text)' : 'var(--text)',
                }}
                onClick={() => {
                  const next = !simulateOffline;
                  setSimulateOffline(next);
                  setSimulatedOffline(next);
                }}
              >
                {simulateOffline ? '✓ Offline Simulated' : 'Simulate Offline'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function DevDebugPanel() {
  if (process.env.NODE_ENV !== 'development') return null;
  return (
    <ToastProvider>
      <DevDebugPanelInner />
    </ToastProvider>
  );
}
