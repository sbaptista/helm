import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { SetupPasskeyForm } from './SetupPasskeyForm';

export default function SetupPasskeyPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text3)',
              fontFamily: "'Lato', sans-serif",
              textAlign: 'center',
              padding: '40px 0',
            }}
          >
            Loading…
          </p>
        }
      >
        <SetupPasskeyForm />
      </Suspense>
    </AuthShell>
  );
}
