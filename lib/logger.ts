import { createClient } from '@supabase/supabase-js'

type LogLevel = 'WARN' | 'ERROR' | 'CRITICAL' | 'FATAL'

const getServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

async function writeLog(
  level: LogLevel,
  source: string,
  message: string,
  payload?: Record<string, unknown>,
  tripId?: string
) {
  try {
    const client = getServiceClient()
    await client.from('helm_logs').insert({
      level,
      source,
      message,
      payload: payload ?? null,
      trip_id: tripId ?? null,
    })
  } catch (err) {
    console.error('[logger] failed to write log:', err)
  }
}

export const logger = {
  warn: (source: string, message: string, payload?: Record<string, unknown>, tripId?: string) =>
    writeLog('WARN', source, message, payload, tripId),
  error: (source: string, message: string, payload?: Record<string, unknown>, tripId?: string) =>
    writeLog('ERROR', source, message, payload, tripId),
  critical: (source: string, message: string, payload?: Record<string, unknown>, tripId?: string) =>
    writeLog('CRITICAL', source, message, payload, tripId),
  fatal: (source: string, message: string, payload?: Record<string, unknown>) =>
    writeLog('FATAL', source, message, payload),
}
