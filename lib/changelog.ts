export interface Release {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: Release[] = [
  {
    version: 'v00.02.0043',
    date: '2026-07-21',
    changes: [
      'Corrected flight timezone handling so airport-local departure and arrival times are converted into real UTC instants before storage and Google Calendar sync.',
      'Updated Helm flight details and edit forms to render each stored instant in its departure or arrival airport timezone with the date-correct HST, PDT, PST, MDT, or MST abbreviation.',
      'Corrected all four Canadian Rockies flight records and marked the Calendar-included flights for resync; the Honolulu departure now represents Oct 3 at 11:30 PM HST rather than 1:30 PM HST.',
      'Applied the same airport-timezone conversion to future manual flight saves and document imports, and made cross-timezone flight validation compare actual instants.',
      'Fixed Clear Calendar so its next Update All rebuilds every Calendar-included flight, hotel, transportation, itinerary, and checklist record instead of leaving all non-flight records clean and omitted.',
      'Prevented the Calendar progress modal from hanging after a successful server-side sync by hardening SSE framing, adding a bounded inactivity timeout, and confirming completion from authoritative server status.',
    ],
  },
  {
    version: 'v00.02.0042',
    date: '2026-07-21',
    changes: [
      'Validated each trip’s stored Google Calendar before syncing so a deleted or inaccessible calendar can no longer produce a false success.',
      'Added recovery for a missing calendar by allowing a writable Google Calendar to be selected or a replacement calendar to be created, then rebuilding only Calendar-included trip items.',
      'Made Calendar status and Update All use the same strict eligibility rule: an item must be both included and dirty.',
      'Made sync progress truthful: failed Google or database operations are shown as errors, remain dirty, and prevent the last-synced timestamp and success state from being recorded.',
      'Preserved dirty state for hotel and checklist rows until every required event operation succeeds, and recreated individual events that were deleted directly in Google.',
    ],
  },
  {
    version: 'v00.02.0041',
    date: '2026-07-21',
    changes: [
      'Migrated the deprecated Next.js middleware file and function convention to proxy without changing its existing request-routing or authentication behavior.',
      'Pinned Next.js and its ESLint configuration to 16.2.5 so clean installs no longer drift to an unreviewed framework patch release.',
      'Synchronized npm package metadata with Helm\'s canonical v00.02.0041 release version.',
    ],
  },
  {
    version: 'v00.02.0037',
    date: '2026-06-03',
    changes: [
      'Bypassed the @supabase/ssr browser client singleton cache using isSingleton: false and a custom local module-level cache, resolving the experimental passkeys error warning.',
    ],
  },
  {
    version: 'v00.02.0036',
    date: '2026-06-03',
    changes: [
      'Enabled experimental passkey options on both client and server Supabase client constructors.',
    ],
  },
  {
    version: 'v00.02.0035',
    date: '2026-06-03',
    changes: [
      'Removed development bypass instructions box from the login form UI.',
    ],
  },
  {
    version: 'v00.02.0034',
    date: '2026-06-03',
    changes: [
      'Implemented global offline guard wrapping root layout children, removing redundant page-level overrides (HELM-54).',
      'Ported WebAuthn/Passkey Client utilities and setup passkey onboarding page (/auth/setup-passkey) from Orb (HELM-59).',
      'Added passkey authentication controls to the email login screen, conditionally rendered on production hostnames (HELM-59).',
      'Converted passwordless OTP validation from 8 digits to 6 digits to align with Orb standards (HELM-59).',
      'Upgraded @supabase/supabase-js and @supabase/ssr dependencies to support WebAuthn APIs (HELM-59).',
    ],
  },
  {
    version: 'v00.02.0033',
    date: '2026-06-03',
    changes: [
      'Implemented Phase 1 of ESLint remediation plan: ignored .claude/ worktrees, relaxed no-explicit-any and set-state-in-effect rules to warnings, and ran mechanical autofix.',
      'Created backlog tasks HELM-60 (Phase 2 hooks) and HELM-61 (Phase 3 TS any) and updated shared knowledge repository.',
    ],
  },
  {
    version: 'v00.02.0032',
    date: '2026-06-03',
    changes: [
      'Aligned project-specific AGENTS.md and HANDOFF.md with latest Orb workspace conventions, including environments, database health analysis, and session rules.',
    ],
  },
  {
    version: 'v00.02.0031',
    date: '2026-05-21',
    changes: [
      'Added version update system — Helm now detects new deployments and shows an update banner with a one-tap refresh.',
      'Added "What\'s New" changelog sheet accessible from the Help button.',
      'Disabled service worker caching in development to prevent stale asset issues.',
    ],
  },
  {
    version: 'v00.02.0027',
    date: '2026-05-21',
    changes: [
      'Fixed hydration mismatch on version labels by deferring render to client-side effect.',
    ],
  },
  {
    version: 'v00.02.0026',
    date: '2026-05-21',
    changes: [
      'Added scroll-to-error behavior on form validation failures.',
    ],
  },
]
