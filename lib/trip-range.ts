// A trip's dates are derived from its itinerary: the earliest and latest
// day_date among its active days. Nothing is stored, so they can't drift.
// (trips.departure_date / return_date are legacy and no longer read.)

export function tripRangeFromDays(
  days: Array<{ day_date: string | null }>,
): { start_date: string | null; end_date: string | null } {
  const dates = days.map(d => d.day_date).filter((d): d is string => !!d).sort()
  return { start_date: dates[0] ?? null, end_date: dates[dates.length - 1] ?? null }
}
