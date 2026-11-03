import { NextResponse } from 'next/server'
import { VERSION } from '@/lib/version'

// The server converts local times with Node's bundled timezone data. BC moved
// to permanent UTC-7 from 2026-11-01 (tz 2026b+); older data still puts
// Vancouver on PST in winter, an hour off (docs/timezone-lookup-plan.md).
function serverTimezoneData() {
  let bcRuleCurrent = false
  try {
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Vancouver', timeZoneName: 'longOffset' })
      .formatToParts(new Date('2027-01-15T12:00:00Z'))
      .find(part => part.type === 'timeZoneName')?.value
    bcRuleCurrent = offset === 'GMT-07:00'
  } catch {}
  return { node: process.version, tzdata: process.versions.tz ?? null, bcRuleCurrent }
}

export async function GET() {
  return NextResponse.json(
    { version: VERSION, timezoneData: serverTimezoneData() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  )
}
