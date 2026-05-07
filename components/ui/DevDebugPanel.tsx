'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { PersistentMessage } from '@/components/ui/PersistentMessage';

const VARIANT_KEY = 'helm-auth-variant';

function DevDebugPanelInner() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [showCritical, setShowCritical] = useState(false);
  const [showFatal, setShowFatal] = useState(false);
  const [authVariant, setAuthVariant] = useState<'a' | 'b'>('a');

  useEffect(() => {
    const stored = localStorage.getItem(VARIANT_KEY);
    if (stored === 'b') setAuthVariant('b');
  }, []);

  async function triggerError() {
    try {
      const res = await fetch('/api/__dev_error');
      if (!res.ok) throw new Error();
    } catch {
      toast.show('Something went wrong', 'error');
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
