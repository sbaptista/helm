import React from 'react';

export type TripStatus = 'active' | 'draft' | 'upcoming' | 'archived';

interface BadgeProps {
  /** Semantic trip status — applies preset colors */
  status?: TripStatus;
  /** Override color (bg, text, border) for custom badges */
  color?: { bg: string; text: string; border?: string };
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const STATUS_COLORS: Record<TripStatus, { bg: string; text: string; border: string }> = {
  active: {
    bg: 'rgba(45,90,61,0.1)',
    text: 'var(--green)',
    border: 'rgba(45,90,61,0.2)',
  },
  draft: {
    bg: 'rgba(90,109,122,0.1)',
    text: 'var(--slate)',
    border: 'rgba(90,109,122,0.2)',
  },
  upcoming: {
    bg: 'rgba(184,137,42,0.1)',
    text: 'var(--gold-text)',
    border: 'rgba(184,137,42,0.2)',
  },
  archived: {
    bg: 'rgba(13,30,53,0.06)',
    text: 'var(--text3)',
    border: 'var(--border2)',
  },
};

export function Badge({ status, color, children, style }: BadgeProps) {
  let bg: string, text: string, border: string;

  if (status) {
    ({ bg, text, border } = STATUS_COLORS[status]);
  } else if (color) {
    bg = color.bg;
    text = color.text;
    border = color.border ?? 'transparent';
  } else {
    bg = 'var(--bg3)';
    text = 'var(--text3)';
    border = 'var(--border2)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '12px',
        fontWeight: 700,
        fontFamily: "'Lato', sans-serif",
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: text,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '20px',
        padding: '3px 10px',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
