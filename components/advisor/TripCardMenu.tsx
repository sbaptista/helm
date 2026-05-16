'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { TripStatus } from '@/types/trips';

interface TripCardMenuProps {
  tripId: string;
  currentStatus: TripStatus;
  onEdit: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onClear: () => void;
  onStatusChange: (status: TripStatus) => void;
}

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
];

const STATUS_PILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active:   { bg: 'rgba(45,90,61,0.1)',   text: 'var(--green)',     border: 'rgba(45,90,61,0.2)' },
  draft:    { bg: 'rgba(90,109,122,0.1)',  text: 'var(--slate)',     border: 'rgba(90,109,122,0.2)' },
  upcoming: { bg: 'rgba(184,137,42,0.1)',  text: 'var(--gold-text)', border: 'rgba(184,137,42,0.2)' },
};

export function TripCardMenu({
  currentStatus,
  onEdit,
  onPrint,
  onDelete,
  onArchive,
  onClear,
  onStatusChange,
}: TripCardMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        aria-label="Trip actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: open ? 'var(--bg3)' : 'transparent',
          border: 'none',
          borderRadius: 'var(--r)',
          cursor: 'pointer',
          color: 'var(--text2)',
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '1px',
          transition: 'background var(--transition)',
        }}
      >
        ⋯
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            width: '200px',
            maxHeight: '220px',
            overflowY: 'auto',
            background: 'var(--bg)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            padding: '6px 0',
            fontFamily: "'Lato', sans-serif",
            fontSize: '14px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem label="Edit" onClick={() => { setOpen(false); onEdit(); }} />
          <MenuItem label="Print" onClick={() => { setOpen(false); onPrint(); }} />

          <div style={{ height: '1px', background: 'var(--border2)', margin: '6px 0' }} />

          <div style={{ padding: '6px 14px 4px', fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Status
          </div>
          <div style={{ display: 'flex', gap: '6px', padding: '4px 14px 8px', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = currentStatus === opt.value;
              const colors = STATUS_PILL_COLORS[opt.value];
              return (
                <button
                  key={opt.value}
                  onClick={() => { if (!isActive) { setOpen(false); onStatusChange(opt.value); } }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: "'Lato', sans-serif",
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: `1.5px solid ${isActive ? colors.border : 'var(--border2)'}`,
                    background: isActive ? colors.bg : 'transparent',
                    color: isActive ? colors.text : 'var(--text3)',
                    cursor: isActive ? 'default' : 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  disabled={isActive}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div style={{ height: '1px', background: 'var(--border2)', margin: '6px 0' }} />

          <MenuItem label="Archive" onClick={() => { setOpen(false); onArchive(); }} />
          <MenuItem label="Clear Data" onClick={() => { setOpen(false); onClear(); }} />
          <MenuItem label="Delete" onClick={() => { setOpen(false); onDelete(); }} danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 14px',
        background: hovered ? 'var(--bg3)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: "'Lato', sans-serif",
        fontSize: '14px',
        fontWeight: 500,
        color: danger ? 'var(--red)' : 'var(--text)',
        transition: 'background var(--transition)',
      }}
    >
      {label}
    </button>
  );
}
