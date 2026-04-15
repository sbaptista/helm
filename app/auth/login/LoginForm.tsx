'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { FormField, inputStyle, inputFocusStyle } from '@/components/ui/FormField';

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
  const [emailSent, setEmailSent] = useState(false);

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
      // Check if the email exists in the users table (server-side)
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) throw new Error('Unable to verify email. Please try again.');

      const data: CheckEmailResponse = await res.json();

      if (data.exists) {
        // Known user — send sign-in link
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          },
        });
        if (error) throw new Error(error.message);
        setEmailSent(true);
      } else {
        // Unknown user — collect account details
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

  if (emailSent) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          textAlign: 'center',
          padding: '8px 0',
        }}
      >
        <span
          role="img"
          aria-label="Envelope"
          style={{ fontSize: '48px', lineHeight: 1 }}
        >
          ✉️
        </span>
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
            lineHeight: 1.6,
            maxWidth: '320px',
          }}
        >
          We sent a sign-in link to{' '}
          <strong style={{ color: 'var(--text2)', fontWeight: 700 }}>{email}</strong>. Click the
          link in the email to sign in — no password needed.
        </p>
        <button
          type="button"
          onClick={() => {
            setEmailSent(false);
            setEmail('');
            setGeneralError(null);
            setEmailError(undefined);
          }}
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
          }}
        >
          Wrong email? Start over
        </button>
      </div>
    );
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
          Welcome back
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
    </form>
  );
}
