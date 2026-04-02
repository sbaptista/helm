export type TripStatus = 'active' | 'draft' | 'upcoming' | 'archived';

export interface Trip {
  id: string;
  title: string;
  destination: string;
  departure_date: string;
  return_date: string;
  status: TripStatus;
  created_at: string;
  traveler_count: number;
}
