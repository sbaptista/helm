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
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
];

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
          <div style={{ display: 'flex', gap: '6px', padding: '4px 14px 8px' }}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setOpen(false); onStatusChange(opt.value); }}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: "'Lato', sans-serif",
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: currentStatus === opt.value ? '1.5px solid var(--navy)' : '1px solid var(--border2)',
                  background: currentStatus === opt.value ? 'rgba(10,30,60,0.06)' : 'transparent',
                  color: currentStatus === opt.value ? 'var(--navy)' : 'var(--text2)',
                  cursor: currentStatus === opt.value ? 'default' : 'pointer',
                  opacity: currentStatus === opt.value ? 0.7 : 1,
                }}
                disabled={currentStatus === opt.value}
              >
                {opt.label}
              </button>
            ))}
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
