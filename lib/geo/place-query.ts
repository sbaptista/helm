// The text a record's timezone is looked up from (docs/timezone-lookup-plan.md).
// Shared by the forms and the server, so both look up the same place.

function join(parts: Array<string | null | undefined>): string {
  return parts.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean).join(', ')
}

/** A complete 3-letter IATA code only, so typing doesn't trigger lookups. */
export function airportQuery(code: string | null | undefined): string {
  const value = (code ?? '').trim().toUpperCase()
  return /^[A-Z]{3}$/.test(value) ? `${value} airport` : ''
}

/** A hotel's or restaurant's place. */
export function placeQuery(row: {
  address?: string | null
  city?: string | null
  province?: string | null
  state_province?: string | null
  postal_code?: string | null
  country?: string | null
}): string {
  // A city is needed; a street address alone is too ambiguous.
  if (!row.city?.trim()) return ''
  return join([row.address, row.city, row.province || row.state_province, row.postal_code, row.country])
}
