// Import Document error codes, shared by /api/trips/import and the import
// modal (docs/import-fix-plan.md, Steps 8–9). Client-safe: no server imports.

export type ImportErrorCode =
  | 'ai_credits'
  | 'ai_busy'
  | 'ai_not_configured'
  | 'ai_too_long'
  | 'ai_error'
  | 'connection';

export const IMPORT_ERROR_MESSAGES: Record<ImportErrorCode, string> = {
  ai_credits:
    'Import isn\'t available: the AI service has run out of credits. Add credit in the Anthropic console, then try again.',
  ai_busy: 'The AI service is busy. Try again in a few minutes.',
  ai_not_configured: 'Import isn\'t set up on this server.',
  ai_too_long:
    'This document is too long to import in one go. Split it into smaller files and import each one.',
  ai_error: 'The AI service couldn\'t read this document.',
  connection: 'Connection lost. Reconnect, then try again.',
};

// Try Again only where retrying the same file can help.
export const IMPORT_ERROR_RETRYABLE: ReadonlySet<ImportErrorCode> = new Set([
  'ai_busy', 'ai_error', 'connection',
]);

export function isImportErrorCode(value: unknown): value is ImportErrorCode {
  return typeof value === 'string' && value in IMPORT_ERROR_MESSAGES;
}

// An error after Claude's text has started streaming can't change the HTTP
// status, so the stream ends with this marker and a JSON { code } instead.
export const IMPORT_STREAM_ERROR_MARKER = '\u0000HELM_IMPORT_ERROR ';

// Development-only: the DEV panel can make /api/trips/import fail with one of
// these codes without calling Claude.
export const DEV_IMPORT_ERROR_KEY = 'helm-dev-import-ai-error';
export const DEV_IMPORT_ERROR_CODES = ['ai_credits', 'ai_busy', 'ai_not_configured'] as const;
