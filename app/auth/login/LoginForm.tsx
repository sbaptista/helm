'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { FormField, inputStyle, inputFocusStyle } from '@/components/ui/FormField';

const isDev = process.env.NODE_ENV === 'development';

interface LoginFormProps {
  initialError: boolean;
}

function useInputFocus() {
  const [focused, setFocused] = useState<string | null>(null);
  return {
    isFocused: (id: string) => focused === id,
    bind: (id: string) => ({
      onFocus: () => setFocused(id),
      onBlur:  () => setFocused(null),
    }),
  };
}

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Please enter a valid email address.';
  return undefined;
}

interface CheckEmailResponse {
  exists: boolean;
}

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

export function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter();
  const focus = useInputFocus();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      if (isDev && email.trim() === process.env.NEXT_PUBLIC_DEV_EMAIL!) {
        router.push('/advisor/dashboard');
        return;
      }

      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) throw new Error('Unable to verify email. Please try again.');

      const data: CheckEmailResponse = await res.json();

      if (data.exists) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false },
        });
        if (error) throw new Error(error.message);
        router.push(`/auth/verify-otp?email=${encodeURIComponent(email.trim())}`);
      } else {
        router.push(`/auth/create-account?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      {/* Heading */}
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
          Welcome to Helm
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--text3)',
            fontFamily: "'Lato', sans-serif",
            lineHeight: 1.5,
          }}
        >
          Enter your email to continue.
        </p>
      </div>

      {/* Callback error banner */}
      {initialError && !generalError && (
        <div role="alert" style={errorBannerStyle}>
          Your sign-in link expired or was already used. Please try again.
        </div>
      )}

      {/* General error banner */}
      {generalError && (
        <div role="alert" style={errorBannerStyle}>
          {generalError}
        </div>
      )}

      <FormField
        label="Email address"
        required
        error={emailError}
        htmlFor="login-email"
      >
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(undefined);
          }}
          style={
            focus.isFocused('login-email')
              ? inputFocusStyle(!!emailError)
              : inputStyle(!!emailError)
          }
          {...focus.bind('login-email')}
        />
      </FormField>

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        style={{ width: '100%', fontSize: '15px' }}
      >
        Continue
      </Button>

      {isDev && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(184,137,42,0.06)',
            border: '1px solid rgba(184,137,42,0.2)',
            borderRadius: 'var(--r)',
            fontSize: '13px',
            color: 'var(--gold)',
            fontFamily: "'Lato', sans-serif",
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          <strong>Dev:</strong> use{' '}
          <code
            style={{
              background: 'rgba(184,137,42,0.1)',
              padding: '1px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            {process.env.NEXT_PUBLIC_DEV_EMAIL}
          </code>{' '}
          to bypass OTP
        </div>
      )}
    </form>
  );
}
