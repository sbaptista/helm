import React from 'react';

interface WarnBadgeProps {
  label: string;
}

export default function WarnBadge({ label }: WarnBadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: 'var(--action)',
      color: 'var(--action-text)',
      fontSize: 'var(--fs-xs)',
      fontWeight: 'var(--fw-medium)',
      padding: '2px 8px',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
    }}>
      ⚠ {label}
    </span>
  );
}
