'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'action';
export type ButtonSize = 'default' | 'sm' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

interface VariantTokens {
  bg: string;
  color: string;
  border: string;
  bgHover: string;
  borderHover: string;
  borderWidth?: string;
  fontWeight?: number;
}

const VARIANTS: Record<ButtonVariant, VariantTokens> = {
  primary: {
    bg: 'var(--gold)',
    color: 'var(--cream)',
    border: 'var(--gold)',
    bgHover: 'var(--gold2)',
    borderHover: 'var(--gold2)',
  },
  secondary: {
    bg: 'transparent',
    color: 'var(--navy)',
    border: 'var(--navy)',
    bgHover: 'rgba(13,30,53,0.06)',
    borderHover: 'var(--navy)',
  },
  ghost: {
    bg: 'transparent',
    color: 'var(--text2)',
    border: 'var(--border2)',
    bgHover: 'rgba(13,30,53,0.04)',
    borderHover: 'var(--border)',
  },
  danger: {
    bg: 'rgba(139,32,32,0.08)',
    color: 'var(--red)',
    border: 'rgba(139,32,32,0.2)',
    bgHover: 'rgba(139,32,32,0.14)',
    borderHover: 'rgba(139,32,32,0.3)',
  },
  action: {
    bg: 'transparent',
    color: 'var(--text)',
    border: '#F5A623',
    bgHover: '#F5A623',
    borderHover: '#F5A623',
    borderWidth: '4px',
    fontWeight: 400,
  },
};

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  default: { fontSize: '14px', padding: '10px 20px', minHeight: '44px', minWidth: '44px' },
  sm:      { fontSize: '12px', padding: '6px 14px',  minHeight: '44px', minWidth: '44px' },
  icon:    { fontSize: '14px', padding: '0',          width: '44px',     height: '44px'  },
};

function Spinner() {
  return (
    <>
      <style>{`@keyframes helm-spin{to{transform:rotate(360deg)}}`}</style>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ animation: 'helm-spin 0.7s linear infinite', flexShrink: 0 }}
      >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
        <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </>
  );
}

export function Button({
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];

  const computedStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Lato', sans-serif",
    fontWeight: v.fontWeight ?? 700,
    letterSpacing: '0.02em',
    borderRadius: 'var(--r)',
    borderStyle: 'solid',
    borderWidth: v.borderWidth ?? '1px',
    borderTopColor: hovered && !isDisabled ? v.borderHover : v.border,
    borderRightColor: hovered && !isDisabled ? v.borderHover : v.border,
    borderBottomColor: hovered && !isDisabled ? v.borderHover : v.border,
    borderLeftColor: hovered && !isDisabled ? v.borderHover : v.border,
    background: hovered && !isDisabled ? v.bgHover : v.bg,
    color: v.color,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    transition: 'background var(--transition), border-top-color var(--transition), border-right-color var(--transition), border-bottom-color var(--transition), border-left-color var(--transition), box-shadow var(--transition), opacity var(--transition)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    textDecoration: 'none',
    boxShadow: hovered && !isDisabled ? 'var(--shadow)' : 'none',
    ...SIZE_STYLES[size],
    ...style,
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={computedStyle}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
