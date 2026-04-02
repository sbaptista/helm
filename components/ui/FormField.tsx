import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

export function FormField({ label, error, hint, required, children, htmlFor }: FormFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: "'Lato', sans-serif",
          color: 'var(--text2)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--red)', fontSize: '12px' }} aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Slot for input/select/textarea — consumers apply their own id matching htmlFor */}
      <div
        style={{
          /* Pass error state down via CSS custom property so child inputs can read it */
          ['--field-error' as string]: error ? '1' : '0',
        }}
      >
        {children}
      </div>

      {error && (
        <p
          role="alert"
          style={{
            fontSize: '12px',
            color: 'var(--red)',
            fontFamily: "'Lato', sans-serif",
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      )}

      {hint && !error && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text3)',
            fontFamily: "'Lato', sans-serif",
            lineHeight: 1.4,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Base input style object — apply to any <input>, <select>, or <textarea>
 * inside a FormField. Pass hasError=true to show red border.
 */
export function inputStyle(hasError = false): React.CSSProperties {
  return {
    width: '100%',
    fontSize: '16px', /* 16px minimum — prevents iOS auto-zoom on focus */
    fontFamily: "'Lato', sans-serif",
    color: 'var(--text)',
    background: 'var(--bg2)',
    border: `1px solid ${hasError ? 'var(--red)' : 'var(--border2)'}`,
    borderRadius: 'var(--r)',
    padding: '12px 14px',
    outline: 'none',
    transition: 'border-color var(--transition), box-shadow var(--transition)',
    WebkitAppearance: 'none',
    appearance: 'none',
    minHeight: '44px',
  };
}

/**
 * Use this to add focus styles via onFocus/onBlur since CSS :focus-within
 * can't read inline styles.
 */
export function inputFocusStyle(hasError = false): React.CSSProperties {
  return {
    ...inputStyle(hasError),
    borderColor: hasError ? 'var(--red)' : 'var(--gold)',
    boxShadow: hasError
      ? '0 0 0 3px rgba(139,32,32,0.1)'
      : '0 0 0 3px rgba(184,137,42,0.12)',
  };
}
