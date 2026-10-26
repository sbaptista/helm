import type { SupabaseClient } from '@supabase/supabase-js'

// A trip has at most one itinerary day per date: the date is the day's identity.
// Returns the message to show when another active day already uses dayDate.
export async function findDayDateClash(
  supabase: SupabaseClient,
  tripId: string,
  dayDate: string,
  excludeDayId?: string,
): Promise<string | null> {
  let query = supabase
    .from('itinerary_days')
    .select('id')
    .eq('trip_id', tripId)
    .eq('day_date', dayDate)
    .is('deleted_at', null)
    .limit(1)
  if (excludeDayId) query = query.neq('id', excludeDayId)
  const { data } = await query
  if (!data || data.length === 0) return null
  const label = new Date(dayDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `There's already a day on ${label}.`
}
