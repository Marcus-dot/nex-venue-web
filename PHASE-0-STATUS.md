# Phase 0 Status

Last updated: 2026-06-15

## Committed files on `rebuild/phase-0`

| File | What it does | Commit |
|---|---|---|
| `lib/firebase/admin.ts` | Initialises firebase-admin for server-side use. Throws explicit error if `FIREBASE_SERVICE_ACCOUNT_JSON` is missing or malformed. | `ef99e1a` |
| `app/api/auth/session/route.ts` | POST: verifies Firebase ID token, sets httpOnly `nex_session` cookie (5-day lifetime). DELETE: clears cookie unconditionally. `runtime = "nodejs"`, `dynamic = "force-dynamic"`. | `acee970` + `25ce7c3` |
| `middleware.ts` | Replaces the fake `nex_auth_session` plain-cookie check. Reads `nex_session` httpOnly cookie, calls `adminAuth.verifySessionCookie()`, forwards `x-nex-uid` header on success, redirects to `/login` on failure. `runtime = "nodejs"`. Positive matcher — `/qa/*` is structurally absent, never enters middleware. | `f10676e` |

`package.json` / `package-lock.json` updated to include `firebase-admin@^14.0.0` — commit `ef99e1a`.

## Local test results (passed)

- `/profile` → `HTTP 307 → /login?redirect=%2Fprofile` ✅
- `/qa/wZ1qrQ5RRzlzDqi6ZoLB` → `HTTP 200` ✅
- No 500 errors after fixing `FIREBASE_SERVICE_ACCOUNT_JSON` double-encoding in `.env.local`
- firebase-admin initialised correctly: private_key parsed, `verifySessionCookie` ran

## Preview runtime check — OPEN

The Vercel preview deploy of `rebuild/phase-0` (commit `25ce7c3`) built successfully (Status: Ready). However the incognito test was blocked by Vercel Deployment Protection — both URLs redirected to Vercel's own login page, not the app.

**A shareable link is being generated from the Vercel dashboard.** Waiting for the owner to report results from the shared preview URL for:
- `[preview-url]/profile` — expected: redirect to `/login`
- `[preview-url]/qa/wZ1qrQ5RRzlzDqi6ZoLB` — expected: Q&A screen loads with live Firestore data

The runtime question (`export const runtime = "nodejs"` honoured in middleware on Vercel) is **not closed** until both results are confirmed from the preview deploy. Local `npm run dev` proved the logic but does not enforce Edge-vs-Node the same way Vercel does.

## Open follow-ups

- **`proxy.ts` migration** — Next.js 16 deprecates `middleware.ts` in favour of `proxy.ts`. Deferred. Not a Phase 0 blocker. Middleware still works; migration is a separate later task, decoupled from the freeze.
- **`FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel** — added to Vercel environment variables (Production + Preview + Development). Confirmed build succeeded with it set.
- **`AuthContext` wiring** — `AuthContext.tsx` still sets the old `nex_auth_session` plain cookie. It has not been updated to call `POST /api/auth/session` yet. This is the next unit after the preview runtime check passes.
- **Route group restructuring** — `(public)`, `(app)`, `(admin)` groups not yet created. Deferred until after AuthContext wiring.
- **`firestore.rules` in web repo** — still the permissive copy. Replacement with the mobile repo's hardened rules is a Phase 0 task, not yet done.
- **`types/` sync** — `isOpen` not yet added to `types/events.ts`. `questions.ts` and `polls.ts` not yet added. Deferred.
- **Debug buttons in `notifications/page.tsx`** — not yet removed.
- **`REBUILD.md`** — committed on the branch as the full rebuild plan.

## Freeze rules (all still in force)

1. All Phase 0 work on `rebuild/phase-0` branch only. Do not merge or push to `main` until the conference is over and the owner has reviewed.
2. Vercel auto-deploys `main` to production — `rebuild/phase-0` produces preview deployments only.
3. Nothing under `app/qa/` is touched. The Q&A display screen is live for the IAZ conference.
4. No `firebase deploy` commands of any kind during the freeze. The shared Firestore database (`nexvenue-2a4fa`) and its deployed rules are not touched.
5. No changes to production Vercel settings (env vars are additive and fine; no redeployment of production to pick them up until after the event).
6. The runtime question stays OPEN until the owner reports incognito results from the shareable preview URL.
