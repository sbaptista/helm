import React from 'react';
import { AlertTriangle, CircleX, OctagonAlert, ShieldX } from 'lucide-react';

type LogLevel = 'WARN' | 'ERROR' | 'CRITICAL' | 'FATAL';

interface LevelBadgeProps {
  level: LogLevel;
}

const LEVEL_CONFIG: Record<LogLevel, {
  label: string;
  Icon: React.ElementType;
  bg: string;
  color: string;
}> = {
  WARN:     { label: 'WARN',     Icon: AlertTriangle, bg: 'var(--action)',   color: 'var(--action-text)'   },
  ERROR:    { label: 'ERROR',    Icon: CircleX,       bg: 'var(--error)',    color: 'var(--error-text)'    },
  CRITICAL: { label: 'CRITICAL', Icon: OctagonAlert,  bg: 'var(--critical)', color: 'var(--critical-text)' },
  FATAL:    { label: 'FATAL',    Icon: ShieldX,       bg: 'var(--fatal)',    color: 'var(--fatal-text)'    },
};

export default function LevelBadge({ level }: LevelBadgeProps) {
  const { label, Icon, bg, color } = LEVEL_CONFIG[level];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: bg,
      color,
      fontSize: 'var(--fs-xs)',
      fontWeight: 'var(--fw-medium)',
      padding: '2px 8px',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
    }}>
      <Icon size={12} />
      {label}
    </span>
  );
}
