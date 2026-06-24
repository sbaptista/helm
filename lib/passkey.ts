import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ──

export interface PasskeyResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface PasskeyEntry {
  id: string;
  friendly_name: string | null;
  created_at: string;
}

interface PasskeyAuthResponse {
  data?: { session?: unknown; passkeys?: PasskeyEntry[] } | PasskeyEntry | null;
  error?: { message: string } | null;
}

interface PasskeyAuth {
  signInWithPasskey(): Promise<PasskeyAuthResponse>;
  registerPasskey(): Promise<PasskeyAuthResponse>;
  passkey: {
    list(): Promise<PasskeyAuthResponse>;
    update(opts: { passkeyId: string; friendlyName: string }): Promise<PasskeyAuthResponse>;
    delete(opts: { passkeyId: string }): Promise<PasskeyAuthResponse>;
  };
}

function getPasskeyAuth(supabase: SupabaseClient): PasskeyAuth {
  return supabase.auth as unknown as PasskeyAuth;
}

// ── Support Detection ──

/** The only domain where the WebAuthn RP ID is configured. */
const PASSKEY_RP_HOSTNAME = 'helm-gilt.vercel.app';

/**
 * Check if the current browser supports WebAuthn / passkeys.
 * Must be called client-side only.
 */
export function isPasskeySupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.PublicKeyCredential;
}

/**
 * Check if passkeys can actually work on this domain.
 * WebAuthn RP ID is only configured for production — localhost and staging
 * will always fail with "invalid domain". Returns false there so the UI
 * can hide passkey options entirely.
 */
export function isPasskeyAvailable(): boolean {
  if (!isPasskeySupported()) return false;
  if (typeof window === 'undefined') return false;
  return window.location.hostname === PASSKEY_RP_HOSTNAME;
}

// ── Authentication ──

/**
 * Sign in with a passkey. Handles the full WebAuthn ceremony via Supabase SDK.
 * Returns session data on success.
 */
export async function authenticateWithPasskey(
  supabase: SupabaseClient
): Promise<PasskeyResult<{ session: unknown }>> {
  try {
    const { data, error } = await getPasskeyAuth(supabase).signInWithPasskey();

    if (error) {
      // User cancelled the WebAuthn prompt
      if (error.message?.includes('AbortError') || error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        return { ok: false, error: 'cancelled' };
      }
      // No credentials found for this device
      if (error.message?.includes('no credentials') || error.message?.includes('NotAllowedError')) {
        return { ok: false, error: 'no_credentials' };
      }
      return { ok: false, error: error.message };
    }

    const session = (data as { session?: unknown } | null)?.session;
    return { ok: true, data: { session } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ── Registration ──

/**
 * Register a new passkey for the current authenticated user.
 * Requires an active session.
 */
export async function registerPasskey(
  supabase: SupabaseClient
): Promise<PasskeyResult<PasskeyEntry>> {
  try {
    const { data, error } = await getPasskeyAuth(supabase).registerPasskey();

    if (error) {
      if (error.message?.includes('AbortError') || error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        return { ok: false, error: 'cancelled' };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as PasskeyEntry };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ── List ──

/**
 * List all passkeys for the current user. Requires an active session.
 */
export async function listPasskeys(
  supabase: SupabaseClient
): Promise<PasskeyResult<PasskeyEntry[]>> {
  try {
    const { data, error } = await getPasskeyAuth(supabase).passkey.list();

    if (error) {
      return { ok: false, error: error.message };
    }

    const response = data as { passkeys?: PasskeyEntry[] } | PasskeyEntry[] | null;
    const passkeys = Array.isArray(response) ? response : (response?.passkeys ?? []);
    return { ok: true, data: passkeys };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ── Rename ──

/**
 * Rename a passkey by its ID. Requires an active session.
 */
export async function renamePasskey(
  supabase: SupabaseClient,
  passkeyId: string,
  friendlyName: string
): Promise<PasskeyResult> {
  try {
    const { error } = await getPasskeyAuth(supabase).passkey.update({
      passkeyId,
      friendlyName,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ── Delete ──

/**
 * Delete a passkey by its ID. Requires an active session.
 */
export async function removePasskey(
  supabase: SupabaseClient,
  passkeyId: string
): Promise<PasskeyResult> {
  try {
    const { error } = await getPasskeyAuth(supabase).passkey.delete({
      passkeyId,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
