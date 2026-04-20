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
    throw new Error(`Google Calendar API error ${res.status}: ${err}`)
  }
  if (res.status === 204) return null
  return res.json()
}
