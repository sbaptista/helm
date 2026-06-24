'use client';

import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { BottomSheet } from './BottomSheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface PrimaryAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

interface ResponsiveSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  primaryAction?: PrimaryAction;
  children: React.ReactNode;
}

export function ResponsiveSheet({
  open,
  onClose,
  title,
  primaryAction,
  children,
}: ResponsiveSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 900px)');

  if (isDesktop) {
    return (
      <Modal open={open} onClose={onClose}>
        <ModalHeader title={title} onClose={onClose} />
        <ModalBody>{children}</ModalBody>
        {primaryAction && (
          <ModalFooter>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: '1px solid var(--border2)',
                borderRadius: 'var(--r)',
                padding: '8px 18px',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: "'Lato', sans-serif",
                color: 'var(--text2)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              style={{
                background: primaryAction.disabled || primaryAction.loading
                  ? 'rgba(184,137,42,0.4)'
                  : 'var(--gold)',
                color: 'var(--cream)',
                border: 'none',
                borderRadius: 'var(--r)',
                padding: '8px 20px',
                cursor: primaryAction.disabled || primaryAction.loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontFamily: "'Lato', sans-serif",
                fontWeight: 700,
                opacity: primaryAction.loading ? 0.6 : 1,
              }}
            >
              {primaryAction.loading ? 'Saving\u2026' : primaryAction.label}
            </button>
          </ModalFooter>
        )}
      </Modal>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      primaryAction={primaryAction}
    >
      {children}
    </BottomSheet>
  );
}
