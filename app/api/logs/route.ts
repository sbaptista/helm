import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

type Level = 'WARN' | 'ERROR' | 'CRITICAL' | 'FATAL';

const levelMap: Record<Level, keyof typeof logger> = {
  WARN:     'warn',
  ERROR:    'error',
  CRITICAL: 'critical',
  FATAL:    'fatal',
};

export async function POST(req: NextRequest) {
  try {
    const { level, source, message, payload } = await req.json();
    const method = levelMap[level as Level];
    if (!method) return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    await logger[method](source, message, payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
