'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { bg: string; color: string; border: string }> = {
  success: {
    bg: 'var(--green)',
    color: '#ffffff',
    border: 'rgba(255,255,255,0.15)',
  },
  error: {
    bg: 'var(--red)',
    color: '#ffffff',
    border: 'rgba(255,255,255,0.15)',
  },
};

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const v = VARIANT_STYLES[item.variant];

  useEffect(() => {
    // Trigger enter animation
    const enterRaf = requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss after 3s
    const timer = setTimeout(() => {
      setVisible(false);
      // Remove after exit animation (200ms)
      setTimeout(() => onDismiss(item.id), 220);
    }, 3000);

    return () => {
      cancelAnimationFrame(enterRaf);
      clearTimeout(timer);
    };
  }, [item.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: 'var(--r-lg)',
        padding: '13px 18px',
        fontSize: '14px',
        fontFamily: "'Lato', sans-serif",
        fontWeight: 400,
        lineHeight: 1.4,
        boxShadow: 'var(--shadow-lg)',
        minWidth: '240px',
        maxWidth: '380px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        pointerEvents: 'auto',
      }}
    >
      {VARIANT_ICONS[item.variant]}
      <span style={{ flex: 1 }}>{item.message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(item.id), 220);
        }}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'currentColor',
          opacity: 0.7,
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '28px',
          minHeight: '28px',
          borderRadius: '4px',
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const success = useCallback((message: string) => show(message, 'success'), [show]);
  const error   = useCallback((message: string) => show(message, 'error'),   [show]);

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          /* Desktop/tablet: top-right */
          top: `calc(20px + var(--sat))`,
          right: '20px',
          /* Mobile (<768px): top-center */
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <style>{`
          @media (max-width: 767px) {
            .helm-toast-container {
              right: 50% !important;
              transform: translateX(50%);
            }
          }
        `}</style>
        <div className="helm-toast-container" style={{ display: 'contents' }}>
          {toasts.map((t) => (
            <ToastItem key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
