'use client';

import React, { useState } from 'react';
import { CalendarModal } from './CalendarModal';
import { Button } from '@/components/ui/Button';

export type CalendarButtonProps = {
  tripId: string;
  tripName: string;
};

export function CalendarButton({ tripId, tripName }: CalendarButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Calendar
      </Button>
      <CalendarModal
        tripId={tripId}
        tripName={tripName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
