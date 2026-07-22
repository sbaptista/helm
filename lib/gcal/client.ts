export class GoogleCalendarApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string
  ) {
    super(`Google Calendar API error ${status}: ${responseBody}`)
    this.name = 'GoogleCalendarApiError'
  }
}

export function isMissingGoogleCalendarResource(error: unknown): boolean {
  return error instanceof GoogleCalendarApiError && (error.status === 404 || error.status === 410)
}

export async function gcalRequest(
  accessToken: string,
  path: string,
  method: string = 'GET',
  body?: object
) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new GoogleCalendarApiError(res.status, err)
  }
  if (res.status === 204) return null
  return res.json()
}
