'use client'

import React, { useEffect, useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { FormField, inputFocusStyle, inputStyle } from '@/components/ui/FormField'
import { scrollToFirstError } from '@/lib/form-utils'
import type { Trip } from '@/types/trips'

interface CopyTripModalProps {
  open: boolean
  sourceTrip: Trip | null
  onClose: () => void
  onSuccess: (tripId: string) => void
}

interface FormValues {
  title: string
  destination: string
  departure_date: string
  return_date: string
}

interface FormErrors {
  title?: string
  destination?: string
  departure_date?: string
  return_date?: string
}

const EMPTY_FORM: FormValues = {
  title: '',
  destination: '',
  departure_date: '',
  return_date: '',
}

function useInputFocus() {
  const [focused, setFocused] = useState<string | null>(null)
  return {
    isFocused: (id: string) => focused === id,
    bind: (id: string) => ({
      onFocus: () => setFocused(id),
      onBlur: () => setFocused(null),
    }),
  }
}

export function CopyTripModal({ open, sourceTrip, onClose, onSuccess }: CopyTripModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const focus = useInputFocus()

  useEffect(() => {
    if (!open || !sourceTrip) return
    setValues({
      title: `${sourceTrip.title} — Copy`,
      destination: sourceTrip.destination ?? '',
      departure_date: sourceTrip.departure_date ?? '',
      return_date: sourceTrip.return_date ?? '',
    })
    setErrors({})
    setGeneralError(null)
  }, [open, sourceTrip])

  const set = (field: keyof FormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues(previous => ({ ...previous, [field]: event.target.value }))
    if (errors[field]) setErrors(previous => ({ ...previous, [field]: undefined }))
  }

  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!values.title.trim()) next.title = 'Trip name is required.'
    if (!values.destination.trim()) next.destination = 'Destination is required.'
    if (!values.departure_date) next.departure_date = 'Departure date is required.'
    if (!values.return_date) next.return_date = 'Return date is required.'
    if (values.departure_date && values.return_date && values.return_date <= values.departure_date) {
      next.return_date = 'Return date must be after departure date.'
    }
    setErrors(next)
    const valid = Object.keys(next).length === 0
    if (!valid) scrollToFirstError()
    return valid
  }

  const handleClose = () => {
    if (loading) return
    setErrors({})
    setGeneralError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!sourceTrip || !validate()) return
    setGeneralError(null)
    setLoading(true)
    try {
      const response = await fetch(`/api/trips/${sourceTrip.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to copy trip.')
      const tripId = result.trip?.id
      if (!tripId || typeof tripId !== 'string') throw new Error('The copied trip ID was not returned.')
      onSuccess(tripId)
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Unable to copy trip.')
      scrollToFirstError()
    } finally {
      setLoading(false)
    }
  }

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

      <div style={{ padding: '12px 14px', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: '14px', lineHeight: 1.5 }}>
        All active trip content and travelers will be copied. Google Calendar links and operational history will not be copied.
      </div>

      <FormField label="Trip Name" required error={errors.title} htmlFor="copy-trip-title">
        <input
          id="copy-trip-title"
          type="text"
          placeholder="e.g. Canadian Rockies Adventure — Updated"
          value={values.title}
          onChange={set('title')}
          autoComplete="off"
          disabled={loading}
          style={focus.isFocused('title') ? inputFocusStyle(!!errors.title) : inputStyle(!!errors.title)}
          {...focus.bind('title')}
        />
      </FormField>

      <FormField label="Destination" required error={errors.destination} htmlFor="copy-trip-destination">
        <input
          id="copy-trip-destination"
          type="text"
          placeholder="e.g. Banff, Alberta, Canada"
          value={values.destination}
          onChange={set('destination')}
          autoComplete="off"
          disabled={loading}
          style={focus.isFocused('destination') ? inputFocusStyle(!!errors.destination) : inputStyle(!!errors.destination)}
          {...focus.bind('destination')}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField label="Departure Date" required error={errors.departure_date} htmlFor="copy-trip-departure">
          <input
            id="copy-trip-departure"
            type="date"
            value={values.departure_date}
            onChange={set('departure_date')}
            disabled={loading}
            style={focus.isFocused('departure_date') ? inputFocusStyle(!!errors.departure_date) : inputStyle(!!errors.departure_date)}
            {...focus.bind('departure_date')}
          />
        </FormField>

        <FormField label="Return Date" required error={errors.return_date} htmlFor="copy-trip-return">
          <input
            id="copy-trip-return"
            type="date"
            value={values.return_date}
            onChange={set('return_date')}
            min={values.departure_date || undefined}
            disabled={loading}
            style={focus.isFocused('return_date') ? inputFocusStyle(!!errors.return_date) : inputStyle(!!errors.return_date)}
            {...focus.bind('return_date')}
          />
        </FormField>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Modal open={open} onClose={handleClose}>
        <ModalHeader title="Copy Trip" onClose={handleClose} />
        <ModalBody>{formContent}</ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>Copy Trip</Button>
        </ModalFooter>
      </Modal>
    )
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="Copy Trip"
      primaryAction={{ label: 'Copy Trip', onClick: handleSubmit, loading }}
    >
      {formContent}
    </BottomSheet>
  )
}
