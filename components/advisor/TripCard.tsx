'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Trip, TripStatus } from '@/types/trips';

interface TripCardProps {
  trip: Trip;
}

function formatDateRange(departure: string, returnDate: string): string {
  // Append T00:00:00 to avoid UTC offset shifting the date
  const dep = new Date(departure + 'T00:00:00');
  const ret = new Date(returnDate + 'T00:00:00');

  const sameYear = dep.getFullYear() === ret.getFullYear();

  const depStr = dep.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const retStr = ret.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${depStr} – ${retStr}`;
}

const STATUS_LABELS: Record<TripStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  upcoming: 'Upcoming',
  archived: 'Archived',
};

export function TripCard({ trip }: TripCardProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking a button
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    router.push(`/advisor/trips/${trip.id}`);
  };

  return (
    <Card
      hover
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        borderLeft: hovered ? '3px solid var(--gold)' : '3px solid transparent',
        transition: 'border-color var(--transition)',
      }}
    >
      {/* Gold accent bar — bleeds to card edges */}
      <div
        aria-hidden="true"
        style={{
          height: '4px',
          background: 'linear-gradient(90deg, var(--gold), var(--gold2))',
          flexShrink: 0,
        }}
      />

      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', flex: 1, gap: '0' }}>
        {/* Status badge — top right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <Badge status={trip.status}>{STATUS_LABELS[trip.status]}</Badge>
        </div>

        {/* Trip name */}
        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--navy)',
            lineHeight: 1.25,
            marginBottom: '10px',
          }}
        >
          {trip.title}
        </h3>

        {/* Destination */}
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text2)',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '13px' }}>📍</span>
          {trip.destination}
        </p>

        {/* Date range */}
        <p
          style={{
            fontSize: '14px',
            color: 'var(--gold-text)',
            fontWeight: 700,
            marginBottom: '6px',
          }}
        >
          {formatDateRange(trip.departure_date, trip.return_date)}
        </p>

        {/* Traveler count */}
        {trip.traveler_count > 0 && (
          <p style={{ fontSize: '14px', color: 'var(--slate)', marginBottom: '0' }}>
            {trip.traveler_count} {trip.traveler_count === 1 ? 'traveler' : 'travelers'}
          </p>
        )}

        {/* Spacer pushes bottom row down */}
        <div style={{ flex: 1, minHeight: '16px' }} />

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border2)',
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/advisor/trips/${trip.id}`)}
          >
            View Trip
          </Button>
        </div>
      </div>
    </Card>
  );
}
