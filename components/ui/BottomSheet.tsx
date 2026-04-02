'use client';

import React, { useEffect, useRef } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Label + handler for the primary action button in the header */
  primaryAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, primaryAction, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escape key support
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'rgba(13,30,53,0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'helm-backdrop-fade 0.18s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes helm-backdrop-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes helm-sheet-slide {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
      <div
        ref={sheetRef}
        style={{
          background: 'var(--bg2)',
          borderRadius: '20px 20px 0 0',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingBottom: 'var(--sab)',
          animation: 'helm-sheet-slide 0.28s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        {/* Drag handle */}
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '12px',
            paddingBottom: '4px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              background: 'var(--border2)',
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 16px 16px',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {/* Cancel — left */}
          <button
            onClick={onClose}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '0 4px',
              background: 'transparent',
              border: 'none',
              color: 'var(--slate)',
              fontSize: '14px',
              fontFamily: "'Lato', sans-serif",
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Cancel
          </button>

          {/* Title — center */}
          <h2
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--navy)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>

          {/* Primary action — right */}
          {primaryAction ? (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              style={{
                minHeight: '44px',
                padding: '0 16px',
                background: primaryAction.disabled || primaryAction.loading
                  ? 'rgba(184,137,42,0.4)'
                  : 'var(--gold)',
                color: 'var(--cream)',
                border: 'none',
                borderRadius: '22px',
                fontSize: '14px',
                fontFamily: "'Lato', sans-serif",
                fontWeight: 700,
                cursor: primaryAction.disabled || primaryAction.loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background var(--transition)',
                whiteSpace: 'nowrap',
              }}
            >
              {primaryAction.loading && (
                <>
                  <style>{`@keyframes helm-spin{to{transform:rotate(360deg)}}`}</style>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
                    style={{ animation: 'helm-spin 0.7s linear infinite' }}>
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </>
              )}
              {primaryAction.label}
            </button>
          ) : (
            /* Spacer to keep title centred */
            <div style={{ minWidth: '44px' }} />
          )}
        </div>

        {/* Scrollable body */}
        <div
          style={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch' as unknown as undefined,
            overscrollBehavior: 'contain',
            padding: '0 16px 24px',
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
