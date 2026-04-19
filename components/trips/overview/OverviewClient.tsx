'use client';

import React, { useContext, useState } from 'react';
import { TabNavigationContext } from '@/components/advisor/TripDetailView';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttentionItem {
  id: string
  source: 'Checklist' | 'Itinerary' | 'Key Info'
  label: string
  action_note: string | null
}

interface OverviewClientProps {
  tripId: string
  trip: { title: string; departure_date: string | null; return_date: string | null }
  counts: { flights: number; hotels: number; transportation: number; restaurants: number; packing: number; checklist_open: number; checklist_total: number }
  attentionRequired: AttentionItem[]
  timeline: Array<{ id: string; day_date: string | null; day_number: number; title: string | null; location: string | null; type: string | null; row_count: number }>
  keyInfoFlagged: Array<{ id: string; label: string; value: string | null; url: string | null; url_label: string | null }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dep = new Date(dateStr + 'T00:00:00')
  dep.setHours(0, 0, 0, 0)
  return Math.ceil((dep.getTime() - today.getTime()) / 86400000)
}

function formatDaysUntil(days: number | null): string {
  if (days === null) return '—'
  if (days === 0) return 'Today'
  if (days < 0) return 'Underway'
  return String(days)
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

function formatDayDate(dayNumber: number, dayDate: string | null): string {
  if (dayNumber === 0) return 'PRE-TRIP'
  if (!dayDate) return `Day ${dayNumber}`
  const d = new Date(dayDate + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const SOURCE_TAB: Record<AttentionItem['source'], string> = {
  'Checklist': 'Checklist',
  'Itinerary': 'Itinerary',
  'Key Info': 'Key Info',
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

// ─── Component ────────────────────────────────────────────────────────────────

export function OverviewClient({
  tripId,
  trip,
  counts,
  attentionRequired,
  timeline,
  keyInfoFlagged,
}: OverviewClientProps) {
  const { navigateTo } = useContext(TabNavigationContext)
  const days = daysUntil(trip.departure_date)
  const daysLabel = formatDaysUntil(days)

  const stats: Array<{ label: string; value: string | number; tab: string | null; isAlert?: boolean }> = [
    { label: 'Days to Go',     value: daysLabel,              tab: null },
    { label: 'Checklist',      value: counts.checklist_total, tab: 'Checklist' },
    { label: 'Flights',        value: counts.flights,         tab: 'Flights' },
    { label: 'Hotel Stays',    value: counts.hotels,          tab: 'Hotels' },
    { label: 'Transfers',      value: counts.transportation,  tab: 'Transportation' },
    { label: 'Restaurants',    value: counts.restaurants,     tab: 'Restaurants' },
    { label: 'Packing Items',  value: counts.packing,         tab: 'Packing' },
  ]

  return (
    <div className="overview-layout">
      <div className="overview-col">

        {/* ── Stats Bar ── */}
        <div className="overview-stats-grid">
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
                return (
                  <div
                    key={day.id}
                    onClick={() => navigateTo('Itinerary', day.id)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '8px 0',
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
                          {formatDayDate(day.day_number, day.day_date)}
                        </span>
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
  )
}
