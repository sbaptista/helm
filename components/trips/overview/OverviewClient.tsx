'use client';

import React, { useContext, useState } from 'react';
import { TabNavigationContext } from '@/components/advisor/TripDetailView';
import type { TripStatus } from '@/types/trips';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttentionItem {
  id: string
  source: 'Checklist' | 'Itinerary' | 'Key Info' | 'Hotels'
  label: string
  action_note: string | null
}

interface OverviewClientProps {
  trip: { title: string; status: TripStatus }
  counts: { flights: number; hotels: number; transportation: number; restaurants: number; packing: number; checklist_open: number; checklist_total: number }
  attentionRequired: AttentionItem[]
  timeline: Array<{ id: string; day_date: string | null; title: string | null; location: string | null; type: string | null; row_count: number }>
  keyInfoFlagged: Array<{ id: string; label: string; value: string | null; url: string | null; url_label: string | null }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000)
}

type Timing = { value: string | number; label: string; dayId: string | null; kind: 'today' | 'next' | null }

// Trip timing comes from the itinerary's first and last dates, not the trip's
// own dates, so day trips and placeholder trips read correctly.
function computeTiming(timeline: OverviewClientProps['timeline'], isDone: boolean): Timing {
  if (isDone) return { value: 'Completed', label: '', dayId: null, kind: null }
  const dated = timeline
    .filter((d): d is typeof d & { day_date: string } => !!d.day_date)
    .sort((a, b) => a.day_date.localeCompare(b.day_date))
  if (dated.length === 0) return { value: 'No dates set', label: '', dayId: null, kind: null }
  const today = localToday()
  const first = dated[0].day_date
  const last = dated[dated.length - 1].day_date
  if (today < first) {
    const n = daysBetween(today, first)
    return { value: n, label: n === 1 ? 'Day to Go' : 'Days to Go', dayId: null, kind: null }
  }
  if (today > last) return { value: 'Completed', label: '', dayId: null, kind: null }
  // Label reads exactly as the day appears in the Trip Timeline list.
  const todayDay = dated.find(d => d.day_date === today)
  if (todayDay) {
    return { value: 'Underway', label: `Today: ${formatDayDate(todayDay.day_date)} · ${todayDay.title || 'Untitled day'}`, dayId: todayDay.id, kind: 'today' }
  }
  const next = dated.find(d => d.day_date > today)!
  return { value: 'Underway', label: `Next: ${formatDayDate(next.day_date)} · ${next.title || 'Untitled day'}`, dayId: next.id, kind: 'next' }
}

function formatTripDates(departure: string | null, returnDate: string | null): string | null {
  if (!departure || !returnDate) return null
  const dep = new Date(departure + 'T00:00:00')
  const ret = new Date(returnDate + 'T00:00:00')
  if (departure === returnDate) {
    return dep.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }
  const sameYear = dep.getFullYear() === ret.getFullYear()
  const depStr = dep.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
  const retStr = ret.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${depStr} – ${retStr}`
}

const DOT_COLORS: Record<string, string> = {
  flight: '#2E6B8A',
  train: '#B8892A',
  free: '#3D7A52',
  transit: '#5A6D7A',
  sightseeing: '#7A5A2E',
}

const TYPE_BADGES: Record<string, { emoji: string; label: string }> = {
  flight: { emoji: '✈️', label: 'Flight' },
  train: { emoji: '🚂', label: 'Train' },
  free: { emoji: '🌄', label: 'Free Day' },
  transit: { emoji: '🚌', label: 'Transit' },
  sightseeing: { emoji: '🗺️', label: 'Sightseeing' },
}

function dotColor(type: string | null): string {
  return DOT_COLORS[type ?? ''] ?? '#999'
}

function typeBadge(type: string | null): { emoji: string; label: string } {
  if (!type) return { emoji: '📍', label: 'Day' }
  return TYPE_BADGES[type] ?? { emoji: '📍', label: type.charAt(0).toUpperCase() + type.slice(1) }
}

function formatDayDate(dayDate: string | null): string {
  if (!dayDate) return 'No date'
  const d = new Date(dayDate + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const SOURCE_TAB: Record<AttentionItem['source'], string> = {
  'Checklist': 'Checklist',
  'Itinerary': 'Itinerary',
  'Key Info': 'Key Info',
  'Hotels': 'Hotels',
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--bg2)',
  borderTop: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  borderBottom: '1px solid var(--border)',
  borderLeft: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  boxShadow: 'var(--shadow)',
  padding: '20px',
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  tab,
  isAlert,
  navigateTo,
}: {
  label: string
  value: string | number
  tab: string | null
  isAlert?: boolean
  navigateTo: (tab: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const isClickable = !!tab

  return (
    <div
      className="overview-stat-card"
      onClick={() => { if (tab) navigateTo(tab) }}
      onMouseEnter={() => { if (isClickable) setHovered(true) }}
      onMouseLeave={() => { if (isClickable) setHovered(false) }}
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '16px 12px',
        textDecoration: 'none',
        cursor: isClickable ? 'pointer' : 'default',
        background: isClickable
          ? (hovered ? 'var(--bg3)' : 'var(--bg2)')
          : 'var(--gold)',
        transition: 'background var(--transition)',
        ...(isAlert ? {
          borderTop: '1px solid var(--red)',
          borderRight: '1px solid var(--red)',
          borderBottom: '1px solid var(--red)',
          borderLeft: '1px solid var(--red)',
        } : {}),
      }}
    >
      <span style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 'var(--fs-stat)',
        fontWeight: 600,
        color: isAlert ? 'var(--red)' : 'var(--navy)',
        lineHeight: 1.1,
      }}>
        {value}
      </span>
      <span style={{
        fontFamily: "'Lato', sans-serif",
        fontSize: 'var(--fs-xs)',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: isAlert ? 'var(--red)' : isClickable ? 'var(--text3)' : 'var(--navy)',
      }}>
        {label}
      </span>
    </div>
  )
}

// ─── TimingCard ───────────────────────────────────────────────────────────────

// First tile: Days to Go → Underway (today's or next day, linked) → Completed.
// The whole tile is the link target so it stays easy to tap.
function TimingCard({ timing, navigateTo }: { timing: Timing; navigateTo: (tab: string, itemId?: string) => void }) {
  const isLink = !!timing.dayId
  const content = (
    <>
      <span suppressHydrationWarning style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 'var(--fs-stat)',
        fontWeight: 600,
        color: 'var(--navy)',
        lineHeight: 1.1,
        textAlign: 'center',
      }}>
        {timing.value}
      </span>
      {timing.label && (
        <span suppressHydrationWarning style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: 'var(--fs-xs)',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: isLink ? 'none' : 'uppercase',
          textDecoration: isLink ? 'underline' : 'none',
          color: 'var(--navy)',
          textAlign: 'center',
        }}>
          {timing.label}
        </span>
      )}
    </>
  )
  const style: React.CSSProperties = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '16px 12px',
    minHeight: '44px',
    background: 'var(--gold)',
  }
  if (!isLink) return <div className="overview-stat-card" style={style}>{content}</div>
  return (
    <button
      type="button"
      className="overview-stat-card"
      onClick={() => navigateTo('Itinerary', timing.dayId!)}
      style={{ ...style, cursor: 'pointer', font: 'inherit', width: '100%' }}
    >
      {content}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OverviewClient({
  trip,
  counts,
  attentionRequired,
  timeline,
  keyInfoFlagged,
}: OverviewClientProps) {
  const { navigateTo } = useContext(TabNavigationContext)
  const isDone = trip.status === 'done'
  const timing = computeTiming(timeline, isDone)
  const datedDays = timeline.map(d => d.day_date).filter((d): d is string => !!d).sort()
  const tripDates = formatTripDates(datedDays[0] ?? null, datedDays[datedDays.length - 1] ?? null)

  const stats: Array<{ label: string; value: string | number; tab: string | null; isAlert?: boolean }> = [
    { label: 'Checklist',      value: counts.checklist_total, tab: 'Checklist' },
    { label: 'Flights',        value: counts.flights,         tab: 'Flights' },
    { label: 'Hotel Stays',    value: counts.hotels,          tab: 'Hotels' },
    { label: 'Transfers',      value: counts.transportation,  tab: 'Transportation' },
    { label: 'Restaurants',    value: counts.restaurants,     tab: 'Restaurants' },
    { label: 'Packing Items',  value: counts.packing,         tab: 'Packing' },
  ]

  return (
    <>
    <h2 style={{
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: '24px',
      fontWeight: 600,
      color: 'var(--navy)',
      margin: '0 0 20px 0',
    }}>
      Overview
    </h2>
    {isDone && (
      <div
        role="status"
        style={{
          ...cardStyle,
          borderLeft: '3px solid var(--navy)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '22px',
          fontWeight: 600,
          color: 'var(--navy)',
        }}>
          Trip done
        </span>
        {tripDates && (
          <span style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: '16px',
            color: 'var(--text2)',
          }}>
            {tripDates}
          </span>
        )}
      </div>
    )}
    <div className="overview-layout">
      <div className="overview-col">

        {/* ── Stats Bar ── */}
        <div className="overview-stats-grid">
          <TimingCard timing={timing} navigateTo={navigateTo} />
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tab={stat.tab}
              isAlert={stat.isAlert}
              navigateTo={navigateTo}
            />
          ))}
        </div>

        {/* ── Attention Required Strip ── */}
        {attentionRequired.length > 0 ? (
          <div style={{ ...cardStyle, borderLeft: '3px solid var(--red)' }}>
            <p style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--navy)',
              margin: '0 0 12px 0',
            }}>
              🔥 Attention Required
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {attentionRequired.map((item) => (
                <div key={item.id}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                    <span style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: 'var(--fs-xs)',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--text3)',
                      flexShrink: 0,
                    }}>
                      {item.source}
                    </span>
                    <span
                      onClick={() => navigateTo(SOURCE_TAB[item.source], item.id)}
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontSize: 'var(--fs-sm)',
                        fontWeight: 'var(--fw-medium)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.action_note && (
                    <p style={{
                      margin: '0 0 0 0',
                      fontFamily: "'Lato', sans-serif",
                      fontSize: 'var(--fs-sm)',
                      color: 'var(--text2)',
                      lineHeight: 1.5,
                    }}>
                      {item.action_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ ...cardStyle }}>
            <p style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--navy)',
              margin: '0 0 8px 0',
            }}>
              🔥 Attention Required
            </p>
            <p style={{
              margin: 0,
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              color: 'var(--text3)',
            }}>
              ✅ Nothing requires attention right now
            </p>
          </div>
        )}

        {/* ── Booking Ref Strip ── */}
        {keyInfoFlagged.length > 0 && (
          <div style={{
            ...cardStyle,
            padding: '16px 20px',
          }}>
            <p style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--navy)',
              margin: '0 0 10px 0',
            }}>
              🔑 Key Info
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              color: 'var(--text3)',
            }}>
              {keyInfoFlagged.map((item) => (
                <span
                  key={item.id}
                  onClick={() => navigateTo('Key Info', item.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--text2)',
                      textDecoration: 'underline',
                    }}
                  >
                    {item.label}
                  </span>
                  {(item.value || item.url_label) && (
                    <>
                      {' '}
                      <span style={{ color: 'var(--text3)' }}>
                        {item.url_label || item.value}
                      </span>
                    </>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
      <div className="overview-col">

        {/* ── Trip Timeline ── */}
        {timeline.length > 0 && (
          <div style={cardStyle}>
            <p style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 'var(--fs-sm)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--navy)',
              margin: '0 0 16px 0',
            }}>
              📅 Trip Timeline
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {timeline.map((day, idx) => {
                const color = dotColor(day.type)
                const badge = typeBadge(day.type)
                const isLast = idx === timeline.length - 1
                const isCurrent = day.id === timing.dayId
                return (
                  <div
                    key={day.id}
                    onClick={() => navigateTo('Itinerary', day.id)}
                    aria-current={isCurrent ? 'date' : undefined}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: isCurrent ? '8px 10px' : '8px 0',
                      margin: isCurrent ? '4px -12px' : 0,
                      border: isCurrent ? '2px solid var(--navy)' : 'none',
                      borderRadius: isCurrent ? 'var(--r)' : 0,
                      background: isCurrent ? 'var(--bg3)' : 'transparent',
                    }}
                  >
                    {/* Dot column with connector */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '12px',
                      flexShrink: 0,
                      paddingTop: '4px',
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }} />
                      {!isLast && (
                        <div style={{
                          width: '2px',
                          flex: 1,
                          background: 'var(--border)',
                          minHeight: '16px',
                        }} />
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}>
                        <span
                          suppressHydrationWarning
                          style={{
                            fontFamily: "'Lato', sans-serif",
                            fontSize: 'var(--fs-sm)',
                            fontWeight: 'var(--fw-bold)',
                            color: 'var(--navy)',
                          }}
                        >
                          {formatDayDate(day.day_date)}
                        </span>
                        {isCurrent && timing.kind && (
                          <span style={{
                            fontFamily: "'Lato', sans-serif",
                            fontSize: 'var(--fs-xs)',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: 'var(--bg)',
                            background: 'var(--navy)',
                            borderRadius: '99px',
                            padding: '1px 8px',
                          }}>
                            {timing.kind === 'today' ? 'Today' : 'Next'}
                          </span>
                        )}
                        {day.title && (
                          <span style={{
                            fontFamily: "'Lato', sans-serif",
                            fontSize: 'var(--fs-sm)',
                            color: 'var(--text2)',
                          }}>
                            {day.title}
                          </span>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '2px',
                      }}>
                        <span style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: 'var(--fs-xs)',
                          color: 'var(--text3)',
                        }}>
                          {day.row_count === 1 ? '1 activity' : `${day.row_count} activities`}
                        </span>
                        <span className="tl-badge" style={{
                          background: `${color}14`,
                          color: color,
                          padding: '1px 8px',
                          borderRadius: '99px',
                          fontFamily: "'Lato', sans-serif",
                          fontSize: 'var(--fs-xs)',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          whiteSpace: 'nowrap',
                        }}>
                          {badge.emoji} {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  )
}
