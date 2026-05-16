'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TripCardMenu } from '@/components/advisor/TripCardMenu';
import type { Trip, TripStatus } from '@/types/trips';

interface TripCardProps {
  trip: Trip;
  onEdit: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onClear: () => void;
  onStatusChange: (status: TripStatus) => void;
}

function formatDateRange(departure: string, returnDate: string): string {
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

export function TripCard({ trip, onEdit, onPrint, onDelete, onArchive, onClear, onStatusChange }: TripCardProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-menu]')) return;
    router.push(`/advisor/trips/${trip.id}`);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
    <Card
      hover
      onClick={handleCardClick}
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
      {/* Gold accent bar */}
      <div
        aria-hidden="true"
        style={{
          height: '4px',
          background: 'linear-gradient(90deg, var(--gold), var(--gold2))',
          flexShrink: 0,
        }}
      />

      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', flex: 1, gap: '0' }}>
        {/* Top row: status badge + menu */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Badge status={trip.status}>{STATUS_LABELS[trip.status]}</Badge>
          <TripCardMenu
            tripId={trip.id}
            currentStatus={trip.status}
            onEdit={onEdit}
            onPrint={onPrint}
            onDelete={onDelete}
            onArchive={onArchive}
            onClear={onClear}
            onStatusChange={onStatusChange}
          />
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
      </div>
    </Card>
    </div>
  );
}
