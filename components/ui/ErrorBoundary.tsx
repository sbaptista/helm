'use client';

import React from 'react';
import FatalErrorPage from '@/components/ui/FatalErrorPage';
import { isOnline, subscribeOnline } from '@/lib/offline/status';

interface State {
  hasError: boolean;
  error: Error | null;
  // Offline when the error happened: the page says so and offers a reload,
  // which opens the copy saved on this device.
  offline: boolean;
  devThrow: boolean;
}

// DEV panel "Trigger Render Error" (development only): a child that throws
// while rendering, so this page can be checked online and offline.
function DevThrow(): never {
  throw new Error('DEV: render error triggered from the DEV panel');
}

// Error reports that couldn't be sent (offline), sent to Logs once Helm is
// online again, so an error that happens offline isn't lost.
const PENDING_KEY = 'helm-pending-error-logs';
const MAX_PENDING = 5;

type ErrorReport = {
  level: 'FATAL';
  source: 'ErrorBoundary';
  message: string;
  payload: Record<string, unknown>;
};

function readPending(): ErrorReport[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writePending(list: ErrorReport[]): void {
  try {
    if (list.length) localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-MAX_PENDING)));
    else localStorage.removeItem(PENDING_KEY);
  } catch {}
}

function offlineNow(): boolean {
  return !isOnline() || (typeof navigator !== 'undefined' && !navigator.onLine);
}

async function send(report: ErrorReport): Promise<boolean> {
  try {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    return res.ok;
  } catch {
    return false;
  }
}

let flushing = false;

// Sends the waiting reports, oldest first; keeps any that still fail.
async function flushPending(): Promise<void> {
  if (flushing || offlineNow()) return;
  const pending = readPending();
  if (pending.length === 0) return;
  flushing = true;
  try {
    const left: ErrorReport[] = [];
    for (const report of pending) {
      if (!(await send(report))) left.push(report);
    }
    writePending(left);
  } finally {
    flushing = false;
  }
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  private unsubscribe: (() => void) | null = null;
  private onDevThrow = () => this.setState({ devThrow: true });

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, offline: false, devThrow: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, offline: offlineNow() };
  }

  componentDidMount() {
    // Reports kept from an earlier offline error: send them now, or as soon
    // as Helm is back online.
    void flushPending();
    this.unsubscribe = subscribeOnline(() => { if (isOnline()) void flushPending(); });
    if (process.env.NODE_ENV === 'development') window.addEventListener('helm-dev-render-error', this.onDevThrow);
  }

  componentWillUnmount() {
    this.unsubscribe?.();
    window.removeEventListener('helm-dev-render-error', this.onDevThrow);
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Helm] Fatal render error:', error, info);
    const offline = offlineNow();
    const report: ErrorReport = {
      level: 'FATAL',
      source: 'ErrorBoundary',
      message: error.message,
      payload: {
        stack: error.stack ?? null,
        componentStack: info.componentStack ?? null,
        name: error.name,
        url: typeof location !== 'undefined' ? location.pathname : null,
        offline,
        occurredAt: new Date().toISOString(),
      },
    };
    if (offline) {
      writePending([...readPending(), report]);
      return;
    }
    void send(report).then((ok) => {
      if (!ok) writePending([...readPending(), report]);
    });
  }

  render() {
    if (this.state.hasError) {
      return <FatalErrorPage error={this.state.error} offline={this.state.offline} />;
    }
    return (
      <>
        {this.props.children}
        {this.state.devThrow && <DevThrow />}
      </>
    );
  }
}
