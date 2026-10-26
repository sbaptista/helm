// Lifecycle order: Draft → Upcoming → Active → Done → Archived.
// Done keeps all trip data; Archive deletes section data.
export const TRIP_STATUSES = ['draft', 'upcoming', 'active', 'done', 'archived'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export interface Trip {
  id: string;
  title: string;
  destination: string;
  // Derived from the itinerary's first and last day (lib/trip-range.ts).
  start_date: string | null;
  end_date: string | null;
  status: TripStatus;
  created_at: string;
  traveler_count: number;
}
