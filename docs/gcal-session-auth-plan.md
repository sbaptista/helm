# Google Calendar with normal login (no bypass)

**Status:** Approved and built 2026-10-22 (v00.03.0016, committed locally, not
pushed). Type check, lint and production build pass. **Verified by Stan
2026-10-22** on `https://localhost:3000` with the bypass commented out: all five
§6 checks passed (connect, status and calendar choice, Update All, Clear and
disconnect, 401 when signed out). Not yet released.
**Author:** 2026-10-22 — Claude Code (Opus 5.5)
**Related:** `docs/helm-secrets-encryption-plan.md` §2.1 (how
`BYPASS_AUTH_USER_ID` is gated).

## 1. Problem

Every Google Calendar route identifies the user only through
`BYPASS_AUTH_USER_ID`:

```ts
function getAuthUserId(): string {
  if (process.env.BYPASS_AUTH_USER_ID) return process.env.BYPASS_AUTH_USER_ID
  throw new Error('Not authenticated')
}
```

With a normal OTP or Passkey login and no bypass, every Calendar action fails:
connect, status, choose a calendar, Update All, Clear and disconnect. The OAuth
callback says so outright: "session auth not implemented here yet".

## 2. Research summary

- **Routes affected (7 files, 1 helper):** `api/gcal/auth` (GET connect,
  DELETE disconnect), `api/gcal/callback`, `api/gcal/status/[tripId]`,
  `api/gcal/calendar` (GET, POST, PUT), `api/gcal/calendar/clear`,
  `api/gcal/push/[section]/[tripId]`, `api/gcal/push/trip/[tripId]`, and
  `lib/gcal/token.ts`.
- **The pattern every other section route already uses** (for example
  `api/flights/[id]/route.ts`): use the bypass ID if it's set, otherwise
  `supabase.auth.getUser()` from the session cookies, return 401 if there's no
  user, use the service-role client for data, and return 403 unless a
  `trip_members` row links the user to the trip.
- **Calendar routes skip the membership check.** With the bypass that didn't
  matter, because there was only one user. With real sessions, any logged-in
  user could read or push any trip's calendar by ID. The fix adds the check.
- **Data client.** The Calendar code uses `getDataClient()`, which is the
  service role only while the bypass is set, and otherwise a client limited by
  the user's RLS. The repo has no migration covering `google_oauth_tokens` or
  its RLS, and agents can't query the database (manual mode), so whether a
  user's session can read its own token row is unknown. The plan follows the
  existing route pattern: service client, scoped by the session user's ID and
  `trip_members`.
- **OAuth `state` carries only the trip ID**, with no anti-forgery value. The
  callback can't tell whether the person returning from Google is the person who
  started the connect. Once tokens are tied to a session user, that allows
  login CSRF: someone could get their own Google account attached to Stan's
  Helm user. The fix adds a one-time nonce.
- **The session cookie reaches the callback.** Google's redirect back is a
  top-level GET, and Supabase SSR cookies are `SameSite=Lax`, so the browser
  sends them.
- **`proxy.ts` is unchanged.** Its login redirect is disabled in every
  environment, and these routes do their own authentication, as the other
  routes already do. Re-enabling it is a separate decision.

## 3. Design

### 3.1 One helper: `lib/gcal/request-user.ts` (new)

```ts
// Bypass first (unchanged behaviour wherever it is set), then the session.
export async function getRequestUserId(): Promise<string | null>
// Service client after the caller has authenticated the user.
export function gcalServiceClient(): SupabaseClient
// true when a trip_members row links userId to tripId.
export async function isTripMember(supabase, tripId, userId): Promise<boolean>
```

`getRequestUserId` uses the same logic as the section routes' `getAuthUserId`.
Only the Calendar code uses the new helper; the 30-odd other routes keep their
own copies, which is a separate cleanup.

### 3.2 Route changes

| Route | Change |
|---|---|
| `auth` GET | Require a user (otherwise redirect to `/auth/login`). Create a random nonce, set it in an `httpOnly`, `Secure`, `SameSite=Lax` cookie (`gcal_oauth_state`, 10 minutes, path `/api/gcal`), and send `state = <nonce>.<tripId>` |
| `auth` DELETE | Session user; delete that user's token row through the service client |
| `callback` | Require a user; require that `state` matches the cookie, then clear the cookie; store tokens under the session user's ID. A mismatch redirects with `gcal_error=state_mismatch` |
| `status`, `push/[section]`, `push/trip`, `calendar`, `calendar/clear` | Session user (401 if none); trip-membership check (403 if not a member) wherever a trip ID is given in the path or body; service client for data |
| `lib/gcal/token.ts` | Takes the service client from the caller instead of calling `getDataClient()` |

Return 401 and 403 as JSON, not thrown errors. `CalendarModal` already handles
a failed response as "not connected" or an error message, so no UI change is
needed. I'll confirm this while building.

### 3.3 What doesn't change

- With `BYPASS_AUTH_USER_ID` set, everything behaves exactly as today (the
  bypass wins), so local development keeps working while that decision is
  open.
- No schema change. `google_oauth_tokens` still has one row per `user_id`.
- `proxy.ts`, the other section routes, and `getDataClient()` are unchanged.

## 4. Database impact

- **New query pattern:** one `trip_members` lookup by `(trip_id, user_id)` per
  Calendar request. This is the same lookup every section route already makes,
  so no new index should be needed. Stan can confirm that an index covering
  `trip_members (trip_id, user_id)` exists (agents can't query in manual mode).
- No Realtime, no new tables, no new write paths. Calendar requests are user
  actions, not per-render.

## 5. Production and data notes

- **Existing token row.** Today's Google token is stored under the bypass user
  ID. If Stan's login user ID is the same, nothing changes. If it differs,
  Calendar shows "not connected" after the bypass is removed, and Stan connects
  Google once more.
- **If `BYPASS_AUTH_USER_ID` is set in Vercel**, production behaviour doesn't
  change with this release, because the bypass still wins. Removing it from
  Vercel is the step that makes production use real sessions, and it affects
  every route and page, not just Calendar (§2.1 of the encryption plan). That
  is a separate decision, not part of this release.
- **Google Cloud console:** no change. The redirect URI and scopes are the same.

## 6. Verification (Stan)

Locally, with the bypass unset (comment out the line in `.env.local`, or after
sealing, `helm-secrets-set --remove BYPASS_AUTH_USER_ID`):

1. Log in with OTP or a Passkey on `https://localhost:3000`.
2. Calendar → Connect Google → consent → back on the trip with
   `gcal_connected=true`.
3. Status shows the connection; choose or create a calendar; Update All; check
   that events appear in Google Calendar; Clear; Disconnect.
4. Logged out, `https://localhost:3000/api/gcal/status/<trip id>` returns 401.
5. Repeat steps 1–3 on iPad and iPhone via `https://stanleys-macbook-pro.local:3000`.
   Google requires the redirect URI to match exactly, so the connect step works
   only on the origin `GOOGLE_REDIRECT_URI` names. Check which one that is.

Agent checks: `npx tsc --noEmit`, `npm run lint` (no new warnings),
`npm run build`.

## 7. Steps

1. **A** — Build §3; bump the version; changelog; HANDOFF; type check, lint and
   build; commit locally.
2. **S** — Verify (§6).
3. **S** — Release (commands in the session reply and in HANDOFF).
