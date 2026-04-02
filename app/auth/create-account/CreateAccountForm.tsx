'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { FormField, inputStyle, inputFocusStyle } from '@/components/ui/FormField';

type AccountType = 'advisor' | 'traveler';

interface CreateAccountValues {
  firstName: string;
  lastName: string;
  accountType: AccountType | null;
}

interface CreateAccountErrors {
  firstName?: string;
  lastName?: string;
  accountType?: string;
}

interface CreateAccountFormProps {
  email: string;
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

function accountTypeCardStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    minHeight: '64px',
    padding: '14px 16px',
    borderRadius: 'var(--r)',
    border: selected ? '2px solid var(--gold)' : '1px solid var(--border2)',
    background: selected ? 'rgba(184,137,42,0.06)' : 'var(--bg2)',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontFamily: "'Lato', sans-serif",
    transition: 'border-color var(--transition), background var(--transition)',
  };
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

export function CreateAccountForm({ email }: CreateAccountFormProps) {
  const router = useRouter();
  const focus = useInputFocus();

  const [values, setValues] = useState<CreateAccountValues>({
    firstName: '',
    lastName: '',
    accountType: null,
  });
  const [errors, setErrors] = useState<CreateAccountErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const setField =
    (field: keyof Pick<CreateAccountValues, 'firstName' | 'lastName'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  function validate(): boolean {
    const next: CreateAccountErrors = {};
    if (!values.firstName.trim()) next.firstName = 'First name is required.';
    if (!values.lastName.trim())  next.lastName  = 'Last name is required.';
    if (!values.accountType)      next.accountType = 'Please select an account type.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const supabase = createClient();

      // Pass profile data as OTP metadata — the callback route will insert
      // the users row server-side after the session is established, so that
      // auth.uid() = id holds and the INSERT policy can be satisfied there.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: values.firstName.trim(),
            last_name:  values.lastName.trim(),
          },
        },
      });

      if (otpError) throw new Error(otpError.message);

      setEmailSent(true);
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
        <span role="img" aria-label="Envelope" style={{ fontSize: '48px', lineHeight: 1 }}>
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
          }}
        >
          Back to sign in
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
          Create your account
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--text3)',
            fontFamily: "'Lato', sans-serif",
            lineHeight: 1.5,
          }}
        >
          You&rsquo;re just a step away.
        </p>
      </div>

      {/* General error */}
      {generalError && (
        <div role="alert" style={errorBannerStyle}>
          {generalError}
        </div>
      )}

      {/* Email — read-only */}
      <FormField label="Email address" htmlFor="ca-email">
        <input
          id="ca-email"
          type="email"
          value={email}
          readOnly
          style={{
            ...inputStyle(false),
            background: 'var(--bg3)',
            color: 'var(--text3)',
            cursor: 'default',
          }}
        />
      </FormField>

      {/* First + Last name */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField
          label="First name"
          required
          error={errors.firstName}
          htmlFor="ca-first"
        >
          <input
            id="ca-first"
            type="text"
            autoComplete="given-name"
            value={values.firstName}
            onChange={setField('firstName')}
            style={
              focus.isFocused('ca-first')
                ? inputFocusStyle(!!errors.firstName)
                : inputStyle(!!errors.firstName)
            }
            {...focus.bind('ca-first')}
          />
        </FormField>

        <FormField
          label="Last name"
          required
          error={errors.lastName}
          htmlFor="ca-last"
        >
          <input
            id="ca-last"
            type="text"
            autoComplete="family-name"
            value={values.lastName}
            onChange={setField('lastName')}
            style={
              focus.isFocused('ca-last')
                ? inputFocusStyle(!!errors.lastName)
                : inputStyle(!!errors.lastName)
            }
            {...focus.bind('ca-last')}
          />
        </FormField>
      </div>

      {/* Account type */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: "'Lato', sans-serif",
            color: 'var(--text2)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          I am a
          <span style={{ color: 'var(--red)' }} aria-hidden="true">
            *
          </span>
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Advisor card */}
          <button
            type="button"
            onClick={() => {
              setValues((p) => ({ ...p, accountType: 'advisor' }));
              if (errors.accountType) setErrors((p) => ({ ...p, accountType: undefined }));
            }}
            style={accountTypeCardStyle(values.accountType === 'advisor')}
            aria-pressed={values.accountType === 'advisor'}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background:
                  values.accountType === 'advisor'
                    ? 'rgba(184,137,42,0.15)'
                    : 'var(--bg3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background var(--transition)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M9 2L11 7h5l-4 3 1.5 5L9 12l-4.5 3L6 10 2 7h5z"
                  stroke={values.accountType === 'advisor' ? 'var(--gold)' : 'var(--slate)'}
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--navy)',
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                Advisor
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text3)',
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                I plan and manage trips for my clients
              </span>
            </div>
          </button>

          {/* Traveler card */}
          <button
            type="button"
            onClick={() => {
              setValues((p) => ({ ...p, accountType: 'traveler' }));
              if (errors.accountType) setErrors((p) => ({ ...p, accountType: undefined }));
            }}
            style={accountTypeCardStyle(values.accountType === 'traveler')}
            aria-pressed={values.accountType === 'traveler'}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background:
                  values.accountType === 'traveler'
                    ? 'rgba(184,137,42,0.15)'
                    : 'var(--bg3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background var(--transition)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M9 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM2 16c0-3.314 3.134-6 7-6s7 2.686 7 6"
                  stroke={values.accountType === 'traveler' ? 'var(--gold)' : 'var(--slate)'}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--navy)',
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                Traveler
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text3)',
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                I&rsquo;m planning or on a trip
              </span>
            </div>
          </button>
        </div>

        {errors.accountType && (
          <p
            role="alert"
            style={{
              fontSize: '12px',
              color: 'var(--red)',
              fontFamily: "'Lato', sans-serif",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {errors.accountType}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        style={{ width: '100%', fontSize: '15px' }}
      >
        Create account
      </Button>
    </form>
  );
}
