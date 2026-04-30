'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { FormField, inputStyle, inputFocusStyle } from '@/components/ui/FormField';

const errorBannerStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(139,32,32,0.06)',
  border: '1px solid rgba(139,32,32,0.2)',
  borderRadius: 'var(--r)',
  fontSize: '14px',
  color: 'var(--red)',
  fontFamily: "'Lato', sans-serif",
  lineHeight: 1.5,
};

export function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const router = useRouter();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    // New account: metadata carries first_name/last_name — create users row
    const meta = user.user_metadata as { first_name?: string; last_name?: string };
    if (meta.first_name && meta.last_name) {
      await supabase.from('users').upsert(
        { id: user.id, email: user.email, first_name: meta.first_name, last_name: meta.last_name },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    router.push(
      existingUser
        ? '/advisor/dashboard'
        : `/auth/create-account?email=${encodeURIComponent(email)}`
    );
  }

  return (
    <form
      onSubmit={handleVerify}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '32px',
            fontWeight: 400,
            color: 'var(--navy)',
            lineHeight: 1.2,
          }}
        >
          Check your inbox
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--text3)',
            fontFamily: "'Lato', sans-serif",
            lineHeight: 1.5,
          }}
        >
          Enter the 8-digit code sent to{' '}
          <strong style={{ color: 'var(--text2)', fontWeight: 700 }}>{email}</strong>.
        </p>
      </div>

      {error && (
        <div role="alert" style={errorBannerStyle}>
          {error}
        </div>
      )}

      <FormField label="Verification code" required htmlFor="otp">
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="12345678"
          style={{
            ...(focused ? inputFocusStyle(false) : inputStyle(false)),
            fontSize: '24px',
            fontWeight: 500,
            textAlign: 'center',
            letterSpacing: '0.3em',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </FormField>

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        disabled={loading || otp.length !== 8}
        style={{ width: '100%', fontSize: '15px' }}
      >
        Verify
      </Button>

      <button
        type="button"
        onClick={() => router.push('/auth/login')}
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
        ← Back to login
      </button>
    </form>
  );
}
