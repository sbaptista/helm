'use client';

import React, { useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { FormField, inputStyle, inputFocusStyle } from '@/components/ui/FormField';
import { scrollToFirstError } from '@/lib/form-utils';

interface CreateTripModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  title: string;
  destination: string;
  departure_date: string;
  return_date: string;
  description: string;
}

interface FormErrors {
  title?: string;
  destination?: string;
  departure_date?: string;
  return_date?: string;
}

const EMPTY_FORM: FormValues = {
  title: '',
  destination: '',
  departure_date: '',
  return_date: '',
  description: '',
};

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

export function CreateTripModal({ open, onClose, onSuccess }: CreateTripModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const toast = useToast();

  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const focus = useInputFocus();

  const set = (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!values.title.trim())        next.title        = 'Trip name is required.';
    if (!values.destination.trim()) next.destination = 'Destination is required.';
    if (!values.departure_date)     next.departure_date = 'Departure date is required.';
    if (!values.return_date)        next.return_date    = 'Return date is required.';

    if (values.departure_date && values.return_date) {
      if (new Date(values.return_date) <= new Date(values.departure_date)) {
        next.return_date = 'Return date must be after departure date.';
      }
    }

    setErrors(next);
    const valid = Object.keys(next).length === 0;
    if (!valid) scrollToFirstError();
    return valid;
  };

  const handleClose = () => {
    if (loading) return;
    setValues(EMPTY_FORM);
    setErrors({});
    setGeneralError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setGeneralError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Failed to create trip.');

      // Success
      setValues(EMPTY_FORM);
      setErrors({});
      onSuccess();
      onClose();
      toast.success('Trip created');
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      scrollToFirstError();
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {generalError && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            background: 'rgba(139,32,32,0.06)',
            border: '1px solid rgba(139,32,32,0.2)',
            borderRadius: 'var(--r)',
            fontSize: '14px',
            color: 'var(--red)',
            lineHeight: 1.5,
          }}
        >
          {generalError}
        </div>
      )}

      <FormField label="Trip Name" required error={errors.title} htmlFor="trip-title">
        <input
          id="trip-title"
          type="text"
          placeholder="e.g. Canadian Rockies Adventure"
          value={values.title}
          onChange={set('title')}
          autoComplete="off"
          style={focus.isFocused('title') ? inputFocusStyle(!!errors.title) : inputStyle(!!errors.title)}
          {...focus.bind('title')}
        />
      </FormField>

      <FormField label="Destination" required error={errors.destination} htmlFor="trip-destination">
        <input
          id="trip-destination"
          type="text"
          placeholder="e.g. Banff, Alberta, Canada"
          value={values.destination}
          onChange={set('destination')}
          autoComplete="off"
          style={focus.isFocused('destination') ? inputFocusStyle(!!errors.destination) : inputStyle(!!errors.destination)}
          {...focus.bind('destination')}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField label="Departure Date" required error={errors.departure_date} htmlFor="trip-departure">
          <input
            id="trip-departure"
            type="date"
            value={values.departure_date}
            onChange={set('departure_date')}
            style={focus.isFocused('departure_date') ? inputFocusStyle(!!errors.departure_date) : inputStyle(!!errors.departure_date)}
            {...focus.bind('departure_date')}
          />
        </FormField>

        <FormField label="Return Date" required error={errors.return_date} htmlFor="trip-return">
          <input
            id="trip-return"
            type="date"
            value={values.return_date}
            onChange={set('return_date')}
            min={values.departure_date || undefined}
            style={focus.isFocused('return_date') ? inputFocusStyle(!!errors.return_date) : inputStyle(!!errors.return_date)}
            {...focus.bind('return_date')}
          />
        </FormField>
      </div>

      <FormField label="Description" hint="Optional notes for yourself or your travelers." htmlFor="trip-description">
        <textarea
          id="trip-description"
          placeholder="Notes for yourself or your travelers..."
          value={values.description}
          onChange={set('description')}
          rows={3}
          style={{
            ...(focus.isFocused('description') ? inputFocusStyle() : inputStyle()),
            resize: 'vertical',
            minHeight: '88px',
          }}
          {...focus.bind('description')}
        />
      </FormField>
    </div>
  );

  if (isDesktop) {
    return (
      <Modal open={open} onClose={handleClose}>
        <ModalHeader title="New Trip" onClose={handleClose} />
        <ModalBody>{formContent}</ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Create Trip
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="New Trip"
      primaryAction={{
        label: 'Create Trip',
        onClick: handleSubmit,
        loading,
      }}
    >
      {formContent}
    </BottomSheet>
  );
}
