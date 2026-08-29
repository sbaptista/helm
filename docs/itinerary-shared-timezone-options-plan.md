# Itinerary shared timezone options

## Problem

The Itinerary timezone selector lists cities as separate options even when they
store the same IANA timezone identifier. Native selects resolve duplicate values
to the first matching option, so selecting Kamloops reappears as Vancouver. The
same latent issue affects Jasper, Lake Louise, and Banff.

## Approved solution

- Represent each stored IANA timezone identifier once in the selector.
- Label `America/Vancouver` as `Vancouver / Kamloops`.
- Label `America/Edmonton` as `Jasper / Lake Louise / Banff`.
- Keep Honolulu and Seattle as their existing unique options.
- Do not change stored values, timestamps, Calendar behavior, or 3×5 formatting.

## Database impact

None. This changes only the labels and uniqueness of existing client-side select
options. It adds no query, write, table, column, index, RLS policy, or Realtime
subscription.

## Approval

Approved by Stan on 2026-08-26.

## Verification

- `npx tsc --noEmit` passed.
- Focused ESLint passed for `ItineraryClient.tsx`.
- `npm run build` passed on Next.js 16.2.5.
- `git diff --check` passed.
