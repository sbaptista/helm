'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { VERSION } from '@/lib/version';
import { inputStyle, inputFocusStyle } from '@/components/ui/FormField';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportFlag {
  field:     string;
  issue:     string;
  proposed?: string;
}

interface ImportResult {
  itinerary_days:   Record<string, unknown>[];
  itinerary_rows:   Record<string, unknown>[];
  flights:          Record<string, unknown>[];
  hotels:           Record<string, unknown>[];
  transportation:   Record<string, unknown>[];
  restaurants:      Record<string, unknown>[];
  checklist_items:  Record<string, unknown>[];
  packing_items:    Record<string, unknown>[];
  key_info:         Record<string, unknown>[];
  unmapped:         string[];
  flags:            ImportFlag[];
}

interface PreviewPayload {
  tripId:    string;
  tripTitle: string;
  result:    ImportResult;
}

// 'fixed'  = applied AI proposed value
// 'edited' = advisor edited the value manually
// 'keep'   = keep as-is, acknowledged
// 'deleted'= record removed
type FlagState = 'pending' | 'fixed' | 'edited' | 'keep' | 'deleted';

// ─── Section config ───────────────────────────────────────────────────────────

const SECTIONS: { key: keyof Omit<ImportResult, 'unmapped' | 'flags'>; label: string }[] = [
  { key: 'itinerary_days',  label: 'Itinerary Days'  },
  { key: 'itinerary_rows',  label: 'Itinerary Items' },
  { key: 'flights',         label: 'Flights'          },
  { key: 'hotels',          label: 'Hotels'           },
  { key: 'transportation',  label: 'Transportation'   },
  { key: 'restaurants',     label: 'Restaurants'      },
  { key: 'checklist_items', label: 'Checklist'        },
  { key: 'packing_items',   label: 'Packing'          },
  { key: 'key_info',        label: 'Key Info'         },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tryParseFieldRef(field: string): { section: string; index: number } | null {
  const match = field.match(/^(\w+)\[(\d+)\]/);
  if (!match) return null;
  return { section: match[1], index: parseInt(match[2], 10) };
}

type FieldType = 'text' | 'date' | 'time' | 'timestamptz' | { type: 'enum'; options: string[] };

const FIELD_TYPES: Record<string, Record<string, FieldType>> = {
  itinerary_days: {
    date: 'date', title: 'text', location: 'text', description: 'text',
  },
  itinerary_rows: {
    time: 'timestamptz', end_time: 'timestamptz', title: 'text',
    description: 'text', location: 'text',
    type: { type: 'enum', options: ['activity', 'meal', 'transport', 'accommodation', 'other'] },
  },
  flights: {
    flight_number: 'text', airline: 'text', departure_airport: 'text',
    arrival_airport: 'text', departure_time: 'timestamptz', arrival_time: 'timestamptz',
    confirmation_code: 'text', notes: 'text',
  },
  hotels: {
    name: 'text', location: 'text', address: 'text', city: 'text',
    check_in_date: 'date', check_out_date: 'date',
    confirmation_code: 'text', phone: 'text', notes: 'text',
  },
  transportation: {
    type: 'text', description: 'text', departure_location: 'text',
    arrival_location: 'text', departure_time: 'timestamptz', arrival_time: 'timestamptz',
    confirmation_code: 'text', notes: 'text',
  },
  restaurants: {
    name: 'text', location: 'text', address: 'text', city: 'text',
    date: 'date', time: 'time', confirmation_code: 'text',
    type: { type: 'enum', options: ['included', 'independent'] },
    notes: 'text',
  },
  checklist_items: {
    title: 'text', category: 'text',
    time_horizon: { type: 'enum', options: ['before_trip', 'during_trip', 'after_trip'] },
  },
  packing_items: { name: 'text', category: 'text' },
  key_info: { category: 'text', label: 'text', value: 'text', url: 'text' },
};

function getFieldType(field: string): FieldType {
  const sectionMatch = field.match(/^(\w+)/);
  const fieldMatch   = field.match(/\.(\w+)$/);
  if (!sectionMatch || !fieldMatch) return 'text';
  return FIELD_TYPES[sectionMatch[1]]?.[fieldMatch[1]] ?? 'text';
}

function formatFieldValue(value: string, fieldType: FieldType): string {
  if (!value) return value;
  try {
    if (fieldType === 'timestamptz') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          + ' at '
          + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      }
    }
    if (fieldType === 'date') {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
    if (fieldType === 'time') {
      const [h, m] = value.split(':').map(Number);
      const d = new Date(); d.setHours(h, m);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (typeof fieldType === 'object' && fieldType.type === 'enum') {
      return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } catch {}
  return value;
}

function buildEffectiveResult(
  result: ImportResult,
  flagStates: Record<number, FlagState>,
): ImportResult {
  const effective = JSON.parse(JSON.stringify(result)) as ImportResult;

  // Collect deletions, sort by index descending within each section so splices
  // don't shift subsequent indices.
  const deletions = result.flags
    .map((flag, i) => ({ ref: tryParseFieldRef(flag.field), state: flagStates[i] }))
    .filter((d): d is { ref: NonNullable<ReturnType<typeof tryParseFieldRef>>; state: FlagState } =>
      d.state === 'deleted' && d.ref !== null,
    )
    .sort((a, b) => b.ref.index - a.ref.index);

  for (const { ref } of deletions) {
    const arr = effective[ref.section as keyof ImportResult];
    if (Array.isArray(arr) && ref.index < arr.length) {
      arr.splice(ref.index, 1);
    }
  }

  return effective;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ItemRow({ item }: { item: Record<string, unknown> }) {
  const entries = Object.entries(item).filter(([, v]) => v !== null && v !== undefined && v !== '');
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text3)', minWidth: '140px', flexShrink: 0, fontFamily: "'Lato', sans-serif", textTransform: 'capitalize' }}>
            {k.replace(/_/g, ' ')}
          </span>
          <span style={{ color: 'var(--text2)', fontFamily: "'Lato', sans-serif", wordBreak: 'break-word' }}>
            {String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ label, items }: { label: string; items: Record<string, unknown>[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--navy)' }}>
            {label}
          </span>
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: '10px' }}>
            {items.length}
          </span>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
          style={{ color: 'var(--text3)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--transition)', flexShrink: 0 }}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 24px 16px' }}>
          {items.length === 0
            ? <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', padding: '8px 0' }}>No items found.</p>
            : items.map((item, i) => <ItemRow key={i} item={item} />)
          }
        </div>
      )}
    </div>
  );
}

// Pill badge shown on a resolved flag
function ResolutionBadge({ state }: { state: FlagState }) {
  const map: Record<Exclude<FlagState, 'pending'>, { label: string; color: string; bg: string }> = {
    fixed:   { label: 'Fixed',      color: 'var(--navy)',  bg: 'rgba(13,30,53,0.07)'      },
    edited:  { label: 'Edited',     color: 'var(--navy)',  bg: 'rgba(13,30,53,0.07)'      },
    keep:    { label: 'Keep as is', color: 'var(--text3)', bg: 'var(--bg3)'               },
    deleted: { label: 'Deleted',    color: 'var(--red)',   bg: 'rgba(139,32,32,0.06)'     },
  };
  const cfg = map[state as Exclude<FlagState, 'pending'>];
  if (!cfg) return null;
  return (
    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: '8px' }}>
      {cfg.label}
    </span>
  );
}

// ─── Field-aware input ────────────────────────────────────────────────────────

function FieldAwareInput({
  fieldType,
  value,
  onChange,
}: {
  fieldType: FieldType;
  value: string;
  onChange: (val: string) => void;
}) {
  const [inputFocused, setInputFocused] = useState(false);
  const baseStyle = inputFocused ? inputFocusStyle() : inputStyle();

  if (typeof fieldType === 'object' && fieldType.type === 'enum') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        style={{ ...baseStyle, cursor: 'pointer' }}
      >
        <option value="">Select…</option>
        {fieldType.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </option>
        ))}
      </select>
    );
  }

  if (fieldType === 'timestamptz') {
    const [datePart, timePart] = value.includes('T')
      ? [value.split('T')[0], value.split('T')[1]?.slice(0, 5) ?? '']
      : [value, ''];
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="date"
          value={datePart}
          onChange={(e) => onChange(`${e.target.value}T${timePart || '00:00'}:00`)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          style={{ ...baseStyle, flex: 1 }}
        />
        <input
          type="time"
          value={timePart}
          onChange={(e) => onChange(`${datePart || ''}T${e.target.value}:00`)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          style={{ ...baseStyle, flex: 1 }}
        />
      </div>
    );
  }

  if (fieldType === 'date') {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        style={baseStyle}
      />
    );
  }

  if (fieldType === 'time') {
    return (
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        style={baseStyle}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setInputFocused(true)}
      onBlur={() => setInputFocused(false)}
      style={baseStyle}
      placeholder="Enter corrected value…"
    />
  );
}

// ─── Flag card ────────────────────────────────────────────────────────────────

interface FlagCardProps {
  flag:         ImportFlag;
  index:        number;
  state:        FlagState;
  editValue:    string;
  onFix:        () => void;
  onEdit:       (val: string) => void;
  onSaveEdit:   () => void;
  onCancelEdit: () => void;
  onKeep:       () => void;
  onDelete:     () => void;
  onUndo:       () => void;
  editOpen:     boolean;
  onOpenEdit:   () => void;
  isLast:       boolean;
}

function FlagCard({
  flag, index, state, editValue,
  onFix, onEdit, onSaveEdit, onCancelEdit, onKeep, onDelete, onUndo,
  editOpen, onOpenEdit, isLast,
}: FlagCardProps) {
  const isResolved  = state !== 'pending';
  const hasProposed = Boolean(flag.proposed?.trim());
  const fieldType   = getFieldType(flag.field);

  return (
    <div
      style={{
        padding: '14px 0',
        borderBottom: isLast ? 'none' : '1px solid rgba(180,130,30,0.15)',
        opacity: isResolved ? 0.65 : 1,
        transition: 'opacity var(--transition)',
      }}
    >
      {/* Field label + resolution badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
          {flag.field}
        </p>
        {isResolved && <ResolutionBadge state={state} />}
      </div>

      {/* Issue description */}
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text2)', marginBottom: '10px' }}>
        {flag.issue}
      </p>

      {/* Proposed fix callout */}
      {hasProposed && !isResolved && (
        <div style={{ background: 'rgba(180,130,30,0.08)', border: '1px solid rgba(180,130,30,0.2)', borderRadius: 'var(--r)', padding: '8px 12px', marginBottom: '12px' }}>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: 'var(--gold-text)', margin: 0 }}>
            <strong>Proposed fix:</strong> {formatFieldValue(flag.proposed!, fieldType)}
          </p>
        </div>
      )}

      {/* Inline edit input — shown when Edit is active */}
      {editOpen && !isResolved && (
        <div style={{ marginBottom: '10px' }}>
          <FieldAwareInput
            fieldType={fieldType}
            value={editValue}
            onChange={onEdit}
          />
          <button
            type="button"
            onClick={onSaveEdit}
            style={{ marginTop: '6px', fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 'var(--r)', border: '1px solid var(--navy)', background: 'var(--navy)', color: 'var(--cream)', cursor: 'pointer', minHeight: '32px' }}
          >
            Save edit
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            style={{
              marginTop: '4px',
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Lato', sans-serif",
              fontSize: '12px',
              color: 'var(--text3)',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              padding: '4px 0',
              minHeight: '32px',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action buttons — only when pending */}
      {!isResolved && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Primary row */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {hasProposed && (
              <button
                type="button"
                onClick={onFix}
                style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 'var(--r)', border: '1px solid var(--navy)', background: 'var(--navy)', color: 'var(--cream)', cursor: 'pointer', minHeight: '36px', transition: 'opacity var(--transition)' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Fix
              </button>
            )}
            <button
              type="button"
              onClick={onOpenEdit}
              style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', minHeight: '36px', transition: 'background var(--transition), border-color var(--transition)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onKeep}
              style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', minHeight: '36px', transition: 'background var(--transition), border-color var(--transition)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
            >
              Keep as Is
            </button>
          </div>

          {/* Danger row — Delete Record as ghost link */}
          <div>
            <button
              type="button"
              onClick={onDelete}
              style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 400, padding: '2px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', textDecoration: 'underline', textUnderlineOffset: '2px', opacity: 0.7, transition: 'opacity var(--transition)' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            >
              Delete record
            </button>
          </div>
        </div>
      )}

      {/* Undo link for resolved flags */}
      {isResolved && (
        <button
          type="button"
          onClick={onUndo}
          style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 400, padding: '2px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', textDecoration: 'underline', textUnderlineOffset: '2px', opacity: 0.7, transition: 'opacity var(--transition)' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
        >
          Undo
        </button>
      )}
    </div>
  );
}

// ─── Inline error panel ───────────────────────────────────────────────────────

function ErrorPanel({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div style={{ border: '1px solid rgba(139,32,32,0.35)', borderRadius: 'var(--r-xl)', background: 'rgba(139,32,32,0.04)', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{ flexShrink: 0, marginTop: '1px' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="var(--red)" strokeWidth="1.5" />
          <path d="M8 5v3.5" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11.25" r="0.75" fill="var(--red)" />
        </svg>
      </div>
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--red)', flex: 1, margin: 0, lineHeight: 1.5 }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', opacity: 0.6, padding: '0', lineHeight: 1, marginTop: '1px', transition: 'opacity var(--transition)' }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── Inner page (needs toast context) ────────────────────────────────────────

function ReviewInner({ tripId, payload }: { tripId: string; payload: PreviewPayload }) {
  const router = useRouter();

  const { result } = payload;
  const flags       = result.flags ?? [];
  const hasFlags    = flags.length > 0;
  const hasUnmapped = (result.unmapped?.length ?? 0) > 0;

  // Per-flag state
  const [flagStates, setFlagStates] = useState<Record<number, FlagState>>(() =>
    Object.fromEntries(flags.map((_, i) => [i, 'pending' as FlagState])),
  );
  // Edited values: default to the current field value, otherwise empty string
  const [flagEdits, setFlagEdits] = useState<Record<number, string>>(() =>
    Object.fromEntries(flags.map((f, i) => {
      const ref = tryParseFieldRef(f.field);
      if (ref) {
        const arr = result[ref.section as keyof ImportResult];
        if (Array.isArray(arr) && ref.index < arr.length) {
          const fieldName = f.field.replace(/^\w+\[\d+\]\.?/, '');
          const val = fieldName ? (arr[ref.index] as Record<string, unknown>)[fieldName] : null;
          if (val != null) return [i, String(val)];
        }
      }
      return [i, ''];
    })),
  );
  // Which flag card has the edit input open
  const [editOpenIndex, setEditOpenIndex] = useState<number | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);
  const [confirmCounts, setConfirmCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Unresolved = still 'pending'
  const unresolvedCount = flags.filter((_, i) => flagStates[i] === 'pending').length;

  const setFlagState = (i: number, s: FlagState) =>
    setFlagStates((prev) => ({ ...prev, [i]: s }));

  const handleFix = (i: number) => {
    setFlagState(i, 'fixed');
    if (editOpenIndex === i) setEditOpenIndex(null);
  };

  const handleOpenEdit = (i: number) => {
    setEditOpenIndex((prev) => (prev === i ? null : i));
  };

  const handleSaveEdit = (i: number) => {
    setFlagState(i, 'edited');
    setEditOpenIndex(null);
  };

  const handleKeep = (i: number) => {
    setFlagState(i, 'keep');
    if (editOpenIndex === i) setEditOpenIndex(null);
  };

  const handleDelete = (i: number) => {
    setFlagState(i, 'deleted');
    if (editOpenIndex === i) setEditOpenIndex(null);
  };

  const handleUndo = (i: number) => {
    setFlagState(i, 'pending');
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      const effectiveResult = buildEffectiveResult(result, flagStates);

      const flagResolutions = flags.map((flag, i) => {
        const state = flagStates[i];
        const originalValue = (() => {
          const ref = tryParseFieldRef(flag.field);
          if (!ref) return null;
          const arr = result[ref.section as keyof ImportResult];
          if (!Array.isArray(arr) || ref.index >= arr.length) return null;
          const fieldName = flag.field.replace(/^\w+\[\d+\]\.?/, '');
          return fieldName ? (arr[ref.index] as Record<string, unknown>)[fieldName] ?? null : null;
        })();

        return {
          field:         flag.field,
          issue:         flag.issue,
          action:        state === 'pending' ? 'unresolved' : state,
          originalValue: originalValue,
          newValue:      state === 'fixed'  ? flag.proposed
                       : state === 'edited' ? (flagEdits[i] ?? null)
                       : null,
        };
      });

      const res = await fetch('/api/trips/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, userId, result: effectiveResult, flagResolutions }),
      });

      let json: Record<string, unknown> = {};
      try { json = await res.json(); } catch {}

      if (!res.ok) {
        throw new Error(
          typeof json.error === 'string' && json.error
            ? json.error
            : `Confirm failed (HTTP ${res.status}).`,
        );
      }

      sessionStorage.removeItem('helm_import_preview');
      sessionStorage.setItem(`helm_import_done_${tripId}`, '1');

      const totalSections = typeof json.totalSections === 'number' ? json.totalSections : '?';
      const counts = (json.counts as Record<string, number>) ?? {};
      setConfirmCounts(counts);
      setConfirming(false);
      const msg = `Import complete — ${totalSections} section${totalSections === 1 ? '' : 's'} imported.`;
      setConfirmSuccess(msg);
      toast.success(msg);
    } catch (err) {
      setConfirming(false);
      setConfirmError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 'calc(64px + var(--sat))', paddingTop: 'var(--sat)', background: 'var(--bg2)', borderBottom: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', gap: '20px' }} className="helm-header-inner">
          <button
            onClick={() => router.push(`/advisor/trips/${tripId}`)}
            aria-label="Back to trip"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontFamily: "'Lato', sans-serif", fontSize: '14px', padding: '4px 0', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {payload.tripTitle}
          </button>
          <span aria-hidden="true" style={{ color: 'var(--border)', fontSize: '18px', lineHeight: 1, userSelect: 'none' }}>/</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 400, color: 'var(--navy)', letterSpacing: '3px', textTransform: 'uppercase', userSelect: 'none' }}>Helm</span>
        </div>
        <style>{`
          @media (max-width: 1023px) { .helm-header-inner { padding: 0 24px !important; } }
          @media (max-width: 767px)  { .helm-header-inner { padding: 0 16px !important; } }
        `}</style>
      </header>

      {/* Main */}
      <main style={{ paddingTop: 'calc(64px + var(--sat) + 40px)', paddingBottom: 'calc(80px + var(--sab))', maxWidth: '800px', margin: '0 auto', paddingLeft: '48px', paddingRight: '48px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="helm-review-main">
        <style>{`
          @media (max-width: 1023px) { .helm-review-main { padding-left: 24px !important; padding-right: 24px !important; } }
          @media (max-width: 767px)  { .helm-review-main { padding-left: 16px !important; padding-right: 16px !important; } }
        `}</style>

        {confirmSuccess ? (
          /* ── Post-import summary panel ──────────────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Heading */}
            <div style={{ marginBottom: '8px' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.2, marginBottom: '6px' }}>
                Import Complete
              </h1>
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)' }}>
                {payload.tripTitle}
              </p>
            </div>

            {/* Records imported */}
            {confirmCounts && SECTIONS.some(({ key }) => (confirmCounts[key] ?? 0) > 0) && (
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', padding: '20px 24px' }}>
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '12px' }}>
                  Records Imported
                </p>
                {SECTIONS.filter(({ key }) => (confirmCounts[key] ?? 0) > 0).map(({ key, label }, idx, arr) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--border2)' : 'none' }}>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text2)' }}>{label}</span>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--navy)' }}>{confirmCounts[key]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Flags summary */}
            {hasFlags && (
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', padding: '20px 24px' }}>
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '12px' }}>
                  Flags — {flags.length} total
                </p>

                {/* Breakdown badges */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border2)' }}>
                  {(['fixed', 'edited', 'keep', 'deleted'] as const).map((s) => {
                    const count = flags.filter((_, i) => flagStates[i] === s).length;
                    if (count === 0) return null;
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ResolutionBadge state={s} />
                        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: 'var(--text3)' }}>{count}</span>
                      </div>
                    );
                  })}
                  {(() => {
                    const n = flags.filter((_, i) => flagStates[i] === 'pending').length;
                    return n > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: '8px' }}>Unresolved</span>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: 'var(--text3)' }}>{n}</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Flag detail rows */}
                {flags.map((flag, i) => {
                  const state = flagStates[i];
                  const finalValue = state === 'fixed'
                    ? flag.proposed
                    : state === 'edited'
                    ? flagEdits[i]
                    : state === 'deleted'
                    ? null
                    : (() => {
                        const ref = tryParseFieldRef(flag.field);
                        if (!ref) return null;
                        const arr = result[ref.section as keyof ImportResult];
                        if (!Array.isArray(arr) || ref.index >= arr.length) return null;
                        const fieldName = flag.field.replace(/^\w+\[\d+\]\.?/, '');
                        return fieldName ? String((arr[ref.index] as Record<string, unknown>)[fieldName] ?? '') : null;
                      })();

                  return (
                    <div key={i} style={{ padding: '10px 0', borderBottom: i < flags.length - 1 ? '1px solid var(--border2)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>{flag.field}</span>
                        <ResolutionBadge state={state} />
                      </div>
                      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: 'var(--text3)', margin: '0 0 4px' }}>{flag.issue}</p>
                      {state === 'deleted' ? (
                        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: 'var(--red)', margin: 0, fontStyle: 'italic' }}>Record deleted</p>
                      ) : finalValue ? (
                        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: 'var(--text2)', margin: 0 }}>
                          <span style={{ color: 'var(--text3)' }}>Value: </span>{finalValue}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        ) : (
          /* ── Normal review content ──────────────────────────────────────── */
          <>
            {/* Page heading */}
            <div style={{ marginBottom: '8px' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.2, marginBottom: '6px' }}>
                Review Import
              </h1>
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)' }}>
                {payload.tripTitle}
              </p>
            </div>

            {/* ── Flags card ────────────────────────────────────────────────── */}
            {hasFlags && (
              <div style={{ background: 'rgba(180,130,30,0.06)', border: '1px solid rgba(180,130,30,0.25)', borderRadius: 'var(--r-xl)', padding: '20px 24px' }}>
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--gold-text)', marginBottom: '14px' }}>
                  Needs Review — {unresolvedCount > 0 ? `${unresolvedCount} of ${flags.length} unresolved` : `${flags.length} resolved`}
                </p>

                {flags.map((flag, i) => (
                  <FlagCard
                    key={i}
                    flag={flag}
                    index={i}
                    state={flagStates[i]}
                    editValue={flagEdits[i] ?? ''}
                    editOpen={editOpenIndex === i}
                    onFix={() => handleFix(i)}
                    onOpenEdit={() => handleOpenEdit(i)}
                    onEdit={(val) => setFlagEdits((prev) => ({ ...prev, [i]: val }))}
                    onSaveEdit={() => handleSaveEdit(i)}
                    onCancelEdit={() => setEditOpenIndex(null)}
                    onKeep={() => handleKeep(i)}
                    onDelete={() => handleDelete(i)}
                    onUndo={() => handleUndo(i)}
                    isLast={i === flags.length - 1}
                  />
                ))}
              </div>
            )}

            {/* Section cards */}
            {SECTIONS.map(({ key, label }) => (
              <SectionCard key={key} label={label} items={result[key] ?? []} />
            ))}

            {/* Unmapped card */}
            {hasUnmapped && (
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', padding: '20px 24px' }}>
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '12px' }}>
                  Unmapped Data — {result.unmapped.length} {result.unmapped.length === 1 ? 'item' : 'items'}
                </p>
                {result.unmapped.map((item, i) => (
                  <p key={i} style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text2)', padding: '6px 0', borderBottom: i < result.unmapped.length - 1 ? '1px solid var(--border2)' : 'none' }}>
                    {item}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

      </main>

      {/* Sticky confirm bar */}
      <div
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg2)', borderTop: '1px solid var(--border2)', boxShadow: '0 -4px 16px rgba(13,30,53,0.08)', padding: '16px 48px', paddingBottom: 'calc(16px + var(--sab))', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', zIndex: 90 }}
        className="helm-confirm-bar"
      >
        <style>{`
          @media (max-width: 767px) {
            .helm-confirm-bar { padding-left: 16px !important; padding-right: 16px !important; }
            .helm-confirm-bar > * { flex: 1; }
          }
        `}</style>
        {confirmSuccess ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="var(--green)" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--green)', flex: 1, margin: 0, lineHeight: 1.5 }}>
              {confirmSuccess}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/advisor/trips/${tripId}`)}
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--navy)',
                background: 'none',
                border: '1px solid var(--navy)',
                borderRadius: 'var(--r)',
                padding: '8px 16px',
                cursor: 'pointer',
                minHeight: '36px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Back to Trip
            </button>
          </div>
        ) : (
          <>
            {confirmError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{ flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="7" stroke="var(--red)" strokeWidth="1.5" />
                    <path d="M8 5v3.5" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="11.25" r="0.75" fill="var(--red)" />
                  </svg>
                </div>
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--red)', flex: 1, margin: 0, lineHeight: 1.5 }}>
                  {confirmError}
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmError(null)}
                  aria-label="Dismiss error"
                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', opacity: 0.6, padding: '0', lineHeight: 1, transition: 'opacity var(--transition)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
            <button
              onClick={() => router.push(`/advisor/trips/${tripId}`)}
              disabled={confirming}
              style={{ background: 'none', border: 'none', fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', cursor: confirming ? 'not-allowed' : 'pointer', opacity: confirming ? 0.5 : 1, padding: '10px 0', textDecoration: 'underline', textUnderlineOffset: '2px', minHeight: '44px' }}
            >
              Cancel
            </button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={confirming}
              style={{ minWidth: '200px' }}
            >
              {unresolvedCount > 0
                ? `Confirm with ${unresolvedCount} unresolved ${unresolvedCount === 1 ? 'flag' : 'flags'}`
                : 'Confirm Import'
              }
            </Button>
          </>
        )}
      </div>

      {/* Version footer */}
      <footer style={{ textAlign: 'center', paddingBottom: 'calc(96px + var(--sab))', paddingTop: '8px' }}>
        <span style={{ fontSize: '11px', fontFamily: "'Lato', sans-serif", color: 'var(--text3)', opacity: 0.5, letterSpacing: '0.04em' }}>
          v{VERSION.version}
        </span>
      </footer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('helm_import_preview');
    if (!raw) { setLoadError(true); return; }
    try { setPayload(JSON.parse(raw) as PreviewPayload); }
    catch { setLoadError(true); }
  }, []);

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg)', fontFamily: "'Lato', sans-serif" }}>
        <p style={{ fontSize: '15px', color: 'var(--text3)' }}>No import data found.</p>
        <Button variant="ghost" onClick={() => router.push(`/advisor/trips/${params.id}`)}>Back to trip</Button>
      </div>
    );
  }

  if (!payload) return null;

  return (
    <ToastProvider>
      <ReviewInner tripId={params.id} payload={payload} />
    </ToastProvider>
  );
}
