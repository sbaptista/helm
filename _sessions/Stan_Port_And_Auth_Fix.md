# Stan's Instructions — Port Change + Magic Link Auth Fix

## Overview

Two related fixes bundled:

1. **Port change** — TODOS moves to `localhost:3001` so both Helm and TODOS dev servers can run simultaneously.
2. **Magic link auth fix** — Supabase Site URL is the root cause of magic links redirecting to localhost when testing Vercel deploys. Fix it once and for all.

AI2 is handling the TODOS `package.json` edit. Everything below is dashboard work for you.

---

## Part 1 — Helm Supabase Dashboard

Project: Helm's Supabase project.

### Auth → URL Configuration

**Site URL:**
Set to: `https://helm-gilt.vercel.app`

(This is the critical fix. Site URL acts as the fallback redirect target. When it's set to `localhost:3000`, Supabase sends magic links there even when the request came from Vercel.)

**Redirect URLs — ensure all of these are in the allowlist:**

- `https://helm-gilt.vercel.app/**`
- `http://localhost:3000/**`

(Helm stays on port 3000, so no change to the localhost entry for Helm.)

---

## Part 2 — TODOS Supabase Dashboard

Project: TODOS's Supabase project.

### Auth → URL Configuration

**Site URL:**
Set to: `<TODOS Vercel production URL>`

(Confirm the exact TODOS Vercel URL from your Vercel dashboard — I don't have it in memory. Same principle as Helm: Site URL must point to production, not localhost.)

**Redirect URLs — ensure both are in the allowlist:**

- `<TODOS Vercel production URL>/**`
- `http://localhost:3001/**`

(Note the port: **3001**, not 3000. This matches the new TODOS dev port.)

---

## Part 3 — Verification Steps

### Step 1: Confirm AI2's port change
After AI2 finishes, check TODOS's `package.json` — `dev` script should end with `-p 3001`.

### Step 2: Test local dev for both projects simultaneously
- Terminal 1: `cd` into Helm → `npm run dev` → should start on `http://localhost:3000`
- Terminal 2: `cd` into TODOS → `npm run dev` → should start on `http://localhost:3001`
- Both should run without port conflicts.

### Step 3: Test magic link from Vercel production
- Go to `https://helm-gilt.vercel.app` in your browser.
- Request a magic link.
- Confirm the email link points to `helm-gilt.vercel.app/...`, **not** `localhost:3000/...`.
- Click it and confirm login succeeds.

### Step 4: Test magic link from localhost
- With `npm run dev` running on port 3000, go to `http://localhost:3000`.
- Request a magic link.
- Confirm the email link points to `localhost:3000/...`.
- Click it and confirm login succeeds.

### Step 5: Repeat Steps 3 and 4 for TODOS
- TODOS Vercel URL → magic link should point to Vercel URL.
- `http://localhost:3001` → magic link should point to localhost:3001.

---

## Part 4 — After Verification

No version bump needed for the port change itself. However, if the magic link behavior is fully fixed across both projects, consider this milestone worth a version bump on the next Helm push — the localhost dev workflow is now unblocked, which was one of your top-of-mind items.

## Rollback

If something breaks:
- **Port change:** revert `package.json` `dev` script to `"next dev"` (without `-p 3001`).
- **Supabase Site URL:** revert to previous value. No data impact — this is config only.

---

## Summary of Changes

| Component | Change |
|---|---|
| TODOS `package.json` | `dev` script gets `-p 3001` |
| Helm Supabase Site URL | Set to `https://helm-gilt.vercel.app` |
| Helm Supabase Redirect URLs | Ensure both Vercel and `localhost:3000/**` present |
| TODOS Supabase Site URL | Set to TODOS Vercel production URL |
| TODOS Supabase Redirect URLs | Add `localhost:3001/**` (not 3000) |
