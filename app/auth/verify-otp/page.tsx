import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { VerifyOtpForm } from './VerifyOtpForm';

export default function VerifyOtpPage() {
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
        <VerifyOtpForm />
      </Suspense>
    </AuthShell>
  );
}
