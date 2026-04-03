import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TripDetailView } from '@/components/advisor/TripDetailView';
import type { Trip, TripStatus } from '@/types/trips';

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: row } = await supabase
    .from('trips')
    .select('id, title, destination, departure_date, return_date, status, created_at')
    .eq('id', id)
    .single();

  const { data: importJob } = await supabase
    .from('import_jobs')
    .select('id')
    .eq('trip_id', id)
    .eq('status', 'completed')
    .maybeSingle();

  if (!row) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          fontFamily: "'Lato', sans-serif",
          color: 'var(--text3)',
          fontSize: '15px',
        }}
      >
        Trip not found.
      </div>
    );
  }

  const trip: Trip = {
    id:             row.id as string,
    title:          row.title as string,
    destination:    row.destination as string,
    departure_date: row.departure_date as string,
    return_date:    row.return_date as string,
    status:         row.status as TripStatus,
    created_at:     row.created_at as string,
    traveler_count: 0,
  };

  return <TripDetailView trip={trip} hasImport={!!importJob} />;
}
