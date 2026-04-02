'use client';

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** If true, clicking backdrop or pressing Escape won't close without calling onConfirmClose */
  confirmClose?: boolean;
  onConfirmClose?: () => void;
  children: React.ReactNode;
}

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

interface ModalBodyProps {
  children: React.ReactNode;
}

interface ModalFooterProps {
  children: React.ReactNode;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 28px 20px',
        borderBottom: '1px solid var(--border2)',
        flexShrink: 0,
      }}
    >
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--navy)',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--r)',
          cursor: 'pointer',
          color: 'var(--slate)',
          transition: 'background var(--transition), color var(--transition)',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--navy)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function ModalBody({ children }: ModalBodyProps) {
  return (
    <div
      style={{
        padding: '24px 28px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch' as unknown as undefined,
        overscrollBehavior: 'contain',
        flex: 1,
        minHeight: 0,
      }}
    >
      {children}
    </div>
  );
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '12px',
        padding: '20px 28px 24px',
        borderTop: '1px solid var(--border2)',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export function Modal({ open, onClose, confirmClose, onConfirmClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const focusableSelectors =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  // Initial focus — depends only on `open` so it fires exactly once when the
  // modal opens, and never again on re-renders. If this shared the same effect
  // as the keydown listener (which depends on onClose/onConfirmClose), every
  // onChange in a child input would cause a re-render → new onClose ref →
  // effect re-run → first?.focus() → focus stolen from the input being typed in.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(focusableSelectors);
    focusable[0]?.focus();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard handler — Escape closes, Tab wraps at the boundary.
  // Queries focusable elements fresh on each Tab so dynamic content
  // (e.g. error messages that add new elements) is handled correctly.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmClose && onConfirmClose) {
          onConfirmClose();
        } else {
          onClose();
        }
      }

      if (e.key === 'Tab') {
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelectors));
        if (focusable.length === 0) { e.preventDefault(); return; }
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, confirmClose, onConfirmClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      if (confirmClose && onConfirmClose) {
        onConfirmClose();
      } else {
        onClose();
      }
    }
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(13,30,53,0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'helm-modal-fade 0.18s ease',
      }}
    >
      <style>{`
        @keyframes helm-modal-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes helm-modal-slide {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        ref={dialogRef}
        style={{
          background: 'var(--bg2)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-lg)',
          width: '92vw',
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'helm-modal-slide 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
