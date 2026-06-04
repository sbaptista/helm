'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isPasskeyAvailable, registerPasskey } from '@/lib/passkey';
import { Button } from '@/components/ui/Button';

export function SetupPasskeyForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkSession() {
      // If passkeys can't work on this domain, skip straight to dashboard
      if (!isPasskeyAvailable()) {
        router.push('/advisor/dashboard');
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setLoading(false);
    }
    checkSession();
  }, [supabase, router]);

  async function handleRegister() {
    setRegistering(true);
    setError('');

    const result = await registerPasskey(supabase);

    if (result.ok) {
      setSuccess(true);
      // Brief delay so the user sees the success state
      setTimeout(() => router.push('/advisor/dashboard'), 800);
      return;
    }

    setRegistering(false);

    if (result.error === 'cancelled') {
      return;
    }

    setError(result.error || 'Failed to register passkey. You can set one up later.');
  }

  function handleSkip() {
    try {
      localStorage.setItem('passkey_prompt_skipped', 'true');
    } catch {
      // localStorage unavailable — skip silently
    }
    router.push('/advisor/dashboard');
  }

  if (loading) {
    return (
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
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--navy)',
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          Set up a passkey
        </p>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text3)',
            fontFamily: "'Lato', sans-serif",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Use Face ID, Touch ID, or your device&apos;s biometric to sign in instantly next time. No codes needed.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            background: 'rgba(139,32,32,0.06)',
            border: '1px solid rgba(139,32,32,0.2)',
            borderRadius: 'var(--r)',
            fontSize: '14px',
            color: 'var(--red)',
            fontFamily: "'Lato', sans-serif",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {success ? (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(45,90,45,0.06)',
              border: '1px solid rgba(45,90,45,0.2)',
              borderRadius: 'var(--r)',
              fontSize: '14px',
              color: '#2d5a2d',
              textAlign: 'center',
              fontWeight: 500,
              fontFamily: "'Lato', sans-serif",
            }}
          >
            Passkey registered. Signing you in…
          </div>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={handleRegister}
            loading={registering}
            style={{ width: '100%', fontSize: '15px' }}
          >
            Register Passkey
          </Button>
        )}

        {!success && (
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold)',
              fontFamily: "'Lato', sans-serif",
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              padding: '4px 0',
              minHeight: '44px',
              alignSelf: 'center',
            }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
