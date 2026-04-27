'use client';

import React from 'react';
import FatalErrorPage from '@/components/ui/FatalErrorPage';

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Helm] Fatal render error:', error, info);
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'FATAL',
        source: 'ErrorBoundary',
        message: error.message,
        payload: {
          stack: error.stack ?? null,
          componentStack: info.componentStack ?? null,
        },
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return <FatalErrorPage error={this.state.error} />;
    }
    return this.props.children;
  }
}
