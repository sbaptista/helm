export interface Release {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: Release[] = [
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
