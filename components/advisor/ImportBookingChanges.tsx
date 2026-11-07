'use client';

// Review page: bookings in the document that are already on the trip, with
// each changed field as old → new and Accept / Skip (docs/reimport-updates-plan.md).

import React from 'react';
import type { BookingDecision, BookingMatch } from '@/lib/import/match-types';

export type FieldDecision = 'accept' | 'skip';

export interface CardDecision {
  candidateId: string | null;
  addAsNew:    boolean;
  fields:      Record<string, FieldDecision>;
}

export type MatchesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; matches: BookingMatch[] }
  | { status: 'failed' };

export function initialCard(match: BookingMatch): CardDecision {
  return {
    candidateId: match.status === 'ambiguous' ? null : match.candidates[0]?.id ?? null,
    addAsNew:    false,
    fields:      {},
  };
}

// Changes Stan hasn't accepted or skipped; at Confirm they're skipped (D2).
export function unreviewedCount(matches: BookingMatch[], decisions: Record<string, CardDecision>): number {
  let n = 0;
  for (const match of matches) {
    if (match.status === 'same') continue;
    const card = decisions[match.key] ?? initialCard(match);
    if (card.addAsNew) continue;
    const candidate = match.candidates.find((c) => c.id === card.candidateId);
    if (!candidate) { n += 1; continue; }
    n += candidate.changes.filter((c) => !card.fields[c.field]).length;
  }
  return n;
}

export function bookingDecisions(matches: BookingMatch[], decisions: Record<string, CardDecision>): BookingDecision[] {
  return matches.map((match) => {
    const card = decisions[match.key] ?? initialCard(match);
    const base = { key: match.key, section: match.section };
    if (card.addAsNew) return { ...base, action: 'add' as const };
    const candidate = match.candidates.find((c) => c.id === card.candidateId);
    if (!candidate) return { ...base, action: 'skip' as const };
    const accepted = candidate.changes.filter((c) => card.fields[c.field] === 'accept').map((c) => c.field);
    return accepted.length > 0
      ? { ...base, action: 'update' as const, id: candidate.id, fields: accepted }
      : { ...base, action: 'skip' as const, id: candidate.id };
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const label12: React.CSSProperties = {
  fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: 'var(--text3)', margin: 0,
};

function pill(active: boolean, tone: 'accept' | 'skip' | 'plain'): React.CSSProperties {
  const activeBg = tone === 'accept' ? 'var(--green)' : tone === 'skip' ? 'var(--slate)' : 'var(--navy)';
  return {
    minHeight: '44px', minWidth: '84px', padding: '0 14px', borderRadius: 'var(--r)',
    border: `1px solid ${active ? activeBg : 'var(--border)'}`,
    background: active ? activeBg : 'var(--bg)', color: active ? '#fff' : 'var(--text)',
    fontFamily: "'Lato', sans-serif", fontSize: '14px', fontWeight: 700, cursor: 'pointer',
  };
}

const textButton: React.CSSProperties = {
  minHeight: '44px', padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: "'Lato', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--gold-text)',
  textDecoration: 'underline', textUnderlineOffset: '2px',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  state:     MatchesState;
  decisions: Record<string, CardDecision>;
  onChange:  (key: string, card: CardDecision) => void;
  onRetry:   () => void;
}

export function ImportBookingChanges({ state, decisions, onChange, onRetry }: Props) {
  if (state.status === 'idle') return null;

  if (state.status === 'loading') {
    return (
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text3)', margin: 0 }}>
        Checking for bookings already on this trip…
      </p>
    );
  }

  if (state.status === 'failed') {
    return (
      <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border2)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text2)', margin: 0, flex: 1, minWidth: '220px' }}>
          Couldn&apos;t check for bookings already on this trip. If you confirm now, every booking is added as new.
        </p>
        <button type="button" style={textButton} onClick={onRetry}>Check again</button>
      </div>
    );
  }

  const same = state.matches.filter((m) => m.status === 'same');
  const changed = state.matches.filter((m) => m.status !== 'same');
  if (same.length === 0 && changed.length === 0) return null;

  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={label12}>Bookings already on this trip</p>

      {same.length > 0 && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
          {same.length === 1 ? '1 booking is' : `${same.length} bookings are`} already on this trip with no changes,
          so {same.length === 1 ? 'it isn’t' : 'they aren’t'} added again: {same.map((m) => m.title).join('; ')}.
        </p>
      )}

      {changed.map((match) => {
        const card = decisions[match.key] ?? initialCard(match);
        const candidate = match.candidates.find((c) => c.id === card.candidateId) ?? null;
        const set = (patch: Partial<CardDecision>) => onChange(match.key, { ...card, ...patch });
        const setAll = (value: FieldDecision) => candidate && set({
          fields: Object.fromEntries(candidate.changes.map((c) => [c.field, value])),
        });

        return (
          <div key={match.key} style={{ borderTop: '1px solid var(--border2)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
              {match.title}
            </p>

            {card.addAsNew ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text2)', margin: 0 }}>
                  Will be added as a new booking.
                </p>
                <button type="button" style={textButton} onClick={() => set({ addAsNew: false })}>Undo</button>
              </div>
            ) : (
              <>
                {match.status === 'ambiguous' && (
                  <div role="radiogroup" aria-label="Which booking does this update?" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text2)', margin: 0 }}>
                      This matches {match.candidates.length} bookings on the trip. Which one does it update?
                    </p>
                    {match.candidates.map((c) => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', cursor: 'pointer', fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text)' }}>
                        <input
                          type="radio"
                          name={`match-${match.key}`}
                          checked={card.candidateId === c.id}
                          onChange={() => set({ candidateId: c.id, fields: {} })}
                          style={{ width: '20px', height: '20px', accentColor: 'var(--gold)' }}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                )}

                {candidate && candidate.changes.length === 0 && (
                  <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: 'var(--text2)', margin: 0 }}>
                    No changes to this booking; it won&apos;t be added again.
                  </p>
                )}

                {candidate && candidate.changes.map((change) => {
                  const decision = card.fields[change.field];
                  return (
                    <div key={change.field} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: 'var(--text3)', margin: '0 0 2px' }}>{change.label}</p>
                        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '15px', color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--text3)', textDecoration: decision === 'accept' ? 'line-through' : 'none' }}>{change.oldText}</span>
                          <span style={{ color: 'var(--text3)' }}> → </span>
                          <strong style={{ textDecoration: decision === 'skip' ? 'line-through' : 'none' }}>{change.newText}</strong>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" aria-pressed={decision === 'accept'} style={pill(decision === 'accept', 'accept')}
                          onClick={() => set({ fields: { ...card.fields, [change.field]: 'accept' } })}>
                          Accept
                        </button>
                        <button type="button" aria-pressed={decision === 'skip'} style={pill(decision === 'skip', 'skip')}
                          onClick={() => set({ fields: { ...card.fields, [change.field]: 'skip' } })}>
                          Skip
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {candidate && candidate.changes.length > 1 && (
                    <>
                      <button type="button" style={textButton} onClick={() => setAll('accept')}>Accept all</button>
                      <button type="button" style={textButton} onClick={() => setAll('skip')}>Skip all</button>
                    </>
                  )}
                  <button type="button" style={textButton} onClick={() => set({ addAsNew: true })}>
                    Add as a new booking instead
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
