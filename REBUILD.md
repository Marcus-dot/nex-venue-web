# NexVenue Web — Rebuild Plan

## 1. Context & Constraints

**What the web app is.** NexVenue is a React Native / Expo mobile app for event networking. The web companion at `nex-venue-web` is not a replacement — it is a secondary surface serving use cases that a phone is not optimal for: a conference room screen showing live Q&A, an organiser managing an agenda from a laptop, and attendees who want a wider-screen view of an event they're attending. Mobile stays the primary attendee experience.

**The live production constraint.** `app/qa/[eventId]/page.tsx` is a real-time Q&A display screen deployed for the IAZ conference and confirmed live in production. It must remain operational throughout all rebuild work. It has no auth dependency (it reads only `approved` and `answered` questions via a Firestore `onSnapshot` listener), and its own layout file at `app/qa/layout.tsx` keeps it isolated from the main app shell. No change to any file in `app/qa/` should be made without explicitly testing that the route still loads and receives live data.

**Approval gate.** This document requires owner sign-off before any code change is made. Section 6 lists the specific decisions that must be resolved before Phase 0 can begin.

---

## 2. Proposed Architecture

### Routing Groups

The Next.js App Router currently uses three route groups. These should be formalised into four:

| Group | Path Pattern | Auth Required | Notes |
|---|---|---|---|
| `(public)` | `/`, `/events`, `/events/[id]` | No | Landing, event discovery, public event detail |
| `(auth)` | `/login`, `/register`, `/profile-setup` | No (redirects if already authed) | Auth flows |
| `(app)` | `/profile`, `/profile/edit`, `/notifications`, `/chat`, `/events/[id]/manage`, `/events/create`, `/events/[id]/edit`, `/events/[id]/special-access`, `/settings` | Yes | Authenticated user surfaces |
| `(admin)` | `/dashboard`, any future `/admin/*` | Yes + `role === 'admin'` | Admin-only surfaces |
| `qa` (no group) | `/qa/[eventId]` | No | Stand-alone display screen — never moved, never touched |

The `(app)` and `(admin)` groups each need their own `layout.tsx` that performs an authoritative server-side auth check before rendering.

### Auth Boundary — Exact Mechanism

**The current system is fundamentally insecure and must be replaced.**

**Current (broken):** `AuthContext.tsx` (line 61–65) sets a plain cookie `nex_auth_session=true` in the browser. `middleware.ts` (line 30) reads this cookie and treats its presence as proof of authentication. This is theatre — any browser request can trivially set `nex_auth_session=true` without a valid Firebase session. Admin-only routes like `/dashboard` do a secondary client-side check via `isAdmin` from `AuthContext`, which itself is derived from a Firestore read that happens only after the component mounts — meaning protected HTML is already in the browser before the role check runs.

**Required replacement:** Firebase Admin SDK in Next.js middleware verifying Firebase ID tokens stored in httpOnly cookies.

The session flow:

1. User completes phone OTP or email/password login. Firebase client SDK returns a `FirebaseUser` with an ID token.
2. The login handler calls `POST /api/auth/session` with the raw ID token. This Route Handler verifies it using `firebase-admin`'s `auth().verifyIdToken()`, then responds with a `Set-Cookie` header: httpOnly, Secure, SameSite=Strict, containing a Firebase session cookie created via `auth().createSessionCookie()`. The cookie is never readable by JavaScript.
3. On every request to a protected route, `middleware.ts` reads this httpOnly cookie, calls `firebase-admin`'s `auth().verifySessionCookie()`, decodes `uid` and role, then either forwards the request with `x-nex-uid` and `x-nex-role` headers attached, or redirects to `/login`. No Firestore read in middleware — only the token is verified.
4. Protected Server Components and Route Handlers read identity from `x-nex-uid` / `x-nex-role` headers. They never trust anything from the client for identity.
5. On logout, `DELETE /api/auth/session` clears the httpOnly cookie server-side.

### Data Layer

**Two Firestore clients, not one:**

- `lib/firebase/client.ts` — web SDK (`firebase/app`) for Client Components and real-time listeners. Only imported in `"use client"` files.
- `lib/firebase/admin.ts` — `firebase-admin` for Server Components, Route Handlers, and middleware. Never imported in client-side code.

The current `lib/firebase/config.ts` exports from the web SDK and is imported in contexts used by both server and client. This must be untangled: server-side data reads go through the Admin SDK; client-side real-time listeners use the web SDK.

**Types — single source of truth:**

The mobile `types/` directory contains the canonical shapes. The web has its own copies with some differences:

- Web `types/auth.ts` is a superset of mobile (includes professional fields, social links, preferences) — keep as canonical for web.
- Web `types/events.ts` is missing `isOpen` — must be added.
- Web `types/` has no `questions.ts` or `polls.ts` — must be added (mirroring mobile versions).

A `SYNC.md` in the web `types/` directory will document which mobile types each web type was derived from and when it was last checked.

### Firestore Rules — Single Source of Truth

The mobile repo's `firestore.rules` is the hardened production rules file and the only one that should ever be deployed. The web repo's `firestore.rules` copy is dangerously permissive (see Section 3) and must be replaced with a copy or symlink of the mobile rules. The mobile repo is the canonical source; the web repo is downstream.

---

## 3. Security Model

### Current Web Rules vs Hardened Mobile Rules

The mobile rules (`nex-venue/firestore.rules`) enforce fine-grained access:

- **`events`**: Read by authenticated users only. Create requires `creatorId == auth.uid`. Update is restricted by role (creator/admin for everything; organisers can only add to the organisers array, not remove; any authenticated user can only modify `attendees[]` on open events). Delete requires creator or admin.
- **`agendas`**: Authenticated read. Write to organisers only; attendees can only update `attendeeSelections`.
- **`questions`**: Approved/answered questions are publicly readable (powers the Q&A display screen). Organisers see all. Authenticated attendees see their own.
- **All other collections**: Scoped read/write with explicit per-role rules.

**Where the web rules diverge (dangerous):**

The web `firestore.rules` uses `allow read, write: if request.auth != null` for events, agendas, role requests, notifications, and all chat collections. This means any authenticated user can:

1. Update any event document (change `creatorId`, remove organisers).
2. Approve or reject any role request.
3. Read any other user's notifications.
4. Write to any chat room they are not a participant in.

Because there is only one Firestore database (project `nexvenue-2a4fa`), only one rules file is ever deployed. The web file is never deployed independently — but if it accidentally were, the production database would be wide open. The web repo's `firestore.rules` must be replaced immediately, independent of any other phase work.

### Auth Enforcement (Post-Rebuild)

1. `middleware.ts` verifies `nex_session` httpOnly cookie via `firebase-admin`. On failure: redirect to `/login`. On success: attach `x-nex-uid` and `x-nex-role` to the request.
2. Server Components in `(app)` and `(admin)` read `x-nex-uid` / `x-nex-role` from `headers()`. If absent, redirect. No `useAuth()` used for access control.
3. Route Handlers same — identity comes from headers, never from request body.
4. `AuthContext` may still exist for UI state (displaying the user's name in the nav), but is never a security gate.

### "No Client-Side Auth Guard" in Practice

Currently pages like `dashboard/page.tsx` (lines 28–36), `notifications/page.tsx` (lines 20–32), `chat/page.tsx` (lines 21–25), and `profile/page.tsx` (line 37) all use `useEffect` to check `useAuth().user` and redirect if null. This means the page HTML is delivered to the browser, React hydrates, then the redirect fires — the protected page flashes or loads before the redirect.

After the rebuild, a protected page is a Server Component:

```tsx
// app/(admin)/dashboard/page.tsx — Server Component
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const role = headers().get("x-nex-role");
    if (role !== "admin") redirect("/events");
    const uid = headers().get("x-nex-uid")!;
    // fetch data server-side using firebase-admin
}
```

The page never reaches the browser if the user is not an admin.

---

## 4. Feature Inventory

| Feature | Current Web Status | Decision | Rationale |
|---|---|---|---|
| Phone OTP auth | Implemented. Session stored in forgeable plain cookie. | REBUILD | Replace post-login flow to exchange ID token for httpOnly session cookie. OTP UI itself can remain. |
| Email/password auth | Implemented. Same broken session storage. Not in mobile app. | REBUILD | Part of auth rebuild. Confirm with owner if this is intentional (see Section 6 Q1). |
| Email/password registration | Implemented. Same session issue. | REBUILD | Part of auth rebuild. |
| Profile setup (post-registration) | `app/(auth)/profile-setup/page.tsx`. Functional. | KEEP | Works correctly. Only change: wire redirect to new session cookie flow. |
| Event feed / discovery | `app/(dashboard)/events/page.tsx`. Paginated list, search, tab filters, featured hero, create shortcut. Functional. Auth-gated client-side. | REBUILD | Move to `(public)` group. Confirm whether events should be publicly browsable (Section 6 Q3). Auth-gated actions (join, create) remain behind auth. |
| Event detail page | `EventDetailsClient.tsx`. Real-time subscription, RSVP, role request modal, speakers/exhibitors, live agenda. Client-side auth guard. | REBUILD | Move to `(public)` group. Server-render initial data via Admin SDK. Replace client-side auth guard. Fix `isOpen` bug (see below). |
| Create event | `app/(dashboard)/events/create/page.tsx`. Exists. | REBUILD | Needs server-side auth gate. |
| Edit event | `app/(dashboard)/events/[id]/edit/page.tsx`. Exists. | REBUILD | Same auth rebuild. |
| Agenda view (read-only) | `AgendaList.tsx` in event detail. Shows live `currentAgendaItem` highlighting. Functional. | KEEP | Works. Keep in event detail with server-rendered initial state, client hydration for live updates. |
| Live agenda tracking (setCurrentAgendaItem) | In manage page. "Go Live" / "End Live" buttons. Functional. | KEEP | Core organiser workflow. Correct implementation. |
| Agenda management (add/delete sessions) | In manage page. Full form with simultaneous group support. Functional. Client-side auth check. | REBUILD | Move auth check server-side. Logic is correct. |
| Simultaneous agenda sessions | In manage page — `simultaneousGroupId` input. Display grouping implemented. | KEEP | Works. No changes beyond auth rebuild. |
| Event group chat | `chat/page.tsx` + `ChatWindow`/`ChatSidebar`. Real-time via `onSnapshot`. Client-side auth guard. | REBUILD | Fix auth gate. Audit collection path consistency with mobile (Section 6 Q6). |
| Direct messages (DMs) | In `ChatSidebar`/`ChatWindow`. Uses `directConversations` collection. | REBUILD | Same auth and collection-consistency issues as group chat. |
| Notifications (in-app) | `notifications/page.tsx`. Real-time, mark-as-read, delete. Has debug buttons in production (lines 111–115). | REBUILD | Remove debug utilities. Replace auth guard. |
| Push notifications | Not implemented. VAPID key in env but no FCM web client. | DEFER | Mobile handles push. In-app notifications cover the web use case. Phase 4 if needed. |
| Profile view (own) | `profile/page.tsx`. Shows events, social links, preferences. Admin panel section is placeholder tiles (lines 392–416) that go nowhere. | REBUILD | Auth gate replacement. Remove or complete placeholder admin tiles. |
| Profile view (other users) | `profile/[userId]/page.tsx`. Reads other users' public profiles. | REBUILD | Confirm if this should be public (Section 6 Q5). Fix auth gate. |
| Edit profile | `profile/edit/page.tsx`. Exists. | REBUILD | Auth gate replacement. |
| Settings | `settings/page.tsx`. Exists. | REBUILD | Auth gate replacement. |
| Admin dashboard | `dashboard/page.tsx`. Shows organiser's events. Hardcoded stats ("92% avg. attendance rate"). Client-side admin check. | REBUILD | Move to `(admin)` group. Server-side role check. Replace or remove hardcoded stats. |
| Role requests (organiser/speaker/exhibitor) | Apply in `EventDetailsClient.tsx`. Approve/reject in manage page. Functional. | REBUILD | Auth gate replacement only. Logic is correct. |
| Q&A display page (`/qa/[eventId]`) | `app/qa/[eventId]/page.tsx`. Production-live, unauthenticated, real-time. Spotlight + queue UI. Working correctly. | KEEP | Do not touch. Must remain live throughout all phases. |
| Q&A moderation (approve/reject questions) | Not implemented on web. Mobile handles this. | REBUILD | High value for organisers at a laptop. Add as a tab in the manage page. Phase 2. Needs `services/questions.ts` (does not exist in web repo). |
| Polls | Not implemented. Mobile has `services/polls.ts`. | DEFER | Phase 5. |
| Ratings | Not implemented. | DEFER | Phase 5. |
| Block user | Not implemented. | DROP | Desktop users are primarily organisers and admins, not attendees doing social blocking. If needed, surface through admin user management only. |
| Manage users (admin) | Placeholder tile in profile page. No `/admin/users` route. | REBUILD | Phase 3. Admins need a user table with role management. |
| Admin requests | Not implemented on web. Mobile has `services/adminRequests.ts`. | DEFER | Phase 3. Low-volume workflow. Simple form on profile page. |
| Attendance requests (closed events) | Not implemented. `joinEvent` in `services/events.ts` writes directly to `attendees[]` without checking `isOpen`. Will silently fail on closed events per Firestore rules. Web `Event` type missing `isOpen` field. | REBUILD | Add `isOpen` to `Event` type. Check `event.isOpen` before showing join button. Show attendance request flow for closed events. Phase 1. |
| Speaker/exhibitor profiles on event detail | `EventDetailsClient.tsx` lines 273–325. One-time `getDocs` of participants subcollection. Functional. | KEEP | Works. Consider converting to real-time listener if participant data changes during events. |
| Special access page | `app/(dashboard)/events/[id]/special-access/page.tsx`. Exists. | REBUILD | Review and apply auth gate replacement. |

---

## 5. Migration & Sequencing Plan

### Phase 0 — Foundation
*Auth, rules, routing, types. No user-visible features change.*

**What gets built:**
1. Add `firebase-admin` dependency. Create `lib/firebase/admin.ts`.
2. Create `app/api/auth/session/route.ts` — POST (set httpOnly session cookie) + DELETE (clear cookie on logout).
3. Update `AuthContext.tsx` — post-login, call `POST /api/auth/session` with `user.getIdToken()`. Remove `nex_auth_session` plain cookie entirely.
4. Replace `middleware.ts` — verify `nex_session` httpOnly cookie via `firebase-admin`. On success, forward with `x-nex-uid` and `x-nex-role` headers. Explicitly exclude `/qa/*` from the protected prefix list.
5. Create route group directories: `app/(public)/`, `app/(app)/`, `app/(admin)/`. Each protected group gets a `layout.tsx` that reads headers and redirects if auth is absent.
6. Add `questions.ts` and `polls.ts` to `web/types/`. Add `isOpen` to `types/events.ts`. Add `SYNC.md`.
7. Replace `web/firestore.rules` with the mobile repo's hardened copy.
8. Remove debug utilities from `notifications/page.tsx` (lines 111–115).

**`/qa/[eventId]` status:** Not touched. Middleware explicitly excludes `/qa/*`. The route loads in incognito with no cookies. This is verified before Phase 0 is marked done.

**Done when:** Fresh browser with no cookies is redirected from `/profile` to `/login`. Valid session cookie grants access. `nex_auth_session` is gone from the codebase. `firebase-admin` in middleware and session route. `/qa/[eventId]` loads in incognito with live data.

---

### Phase 1 — Core Public Surfaces
*Event discovery and event detail become publicly accessible. Closed-event bug fixed.*

**What gets built:**
1. Move event list and event detail to `(public)` group.
2. Server Component fetches initial event data and agenda via `firebase-admin` (or confirm with owner whether to add a public read rule to the `events` collection — see Section 6 Q3).
3. Client Component hydrates for real-time updates (live agenda, attendee count).
4. Fix `isOpen` bug: add `isOpen` field to `Event` type, check before showing join button. Show attendance request flow for closed events.
5. RSVP join/leave: authenticated users only. Unauthenticated users clicking join are redirected to `/login?redirect=/events/<id>`.

**`/qa/[eventId]` status:** No changes. Still isolated, still live.

**Done when:** Event list and event detail load without login. RSVP works for authenticated users. Closed events show correct button. RSVP redirects unauthenticated users to login.

---

### Phase 2 — Organiser Tooling
*Create/edit events, manage agenda, approve role requests, Q&A moderation.*

**What gets built:**
1. Create and edit event pages — server-side auth gate.
2. Manage page — server-side organiser check replacing the current client-side re-fetch (lines 122–133 of manage page).
3. Q&A moderation — new "Q&A" tab in manage page. Create `services/questions.ts` with `subscribeToEventQuestions`, `approveQuestion`, `rejectQuestion`, `markAnswered`. Approved questions appear on `/qa/[eventId]` display screen automatically within seconds.
4. Agenda management — auth gate only. Logic unchanged.
5. Role request management — auth gate only. Logic unchanged.
6. Special access page — review and apply auth gate.

**`/qa/[eventId]` status:** The Q&A moderation tab writes to the same `questions` collection the display screen reads. No change to `app/qa/` itself. Approve a question in the manage page → it appears on the display screen in real time.

**Done when:** Organiser can manage all event aspects from their laptop. Q&A approvals appear on the display screen within 2 seconds. All routes are server-side auth gated.

---

### Phase 3 — Admin Surfaces
*Admin dashboard with real data, user management.*

**What gets built:**
1. `app/(admin)/` group with `layout.tsx` checking `x-nex-role === 'admin'` server-side.
2. Move `dashboard/page.tsx` to `(admin)`. Replace hardcoded stats with server-side computed values from Firestore.
3. `app/(admin)/users/page.tsx` — paginated user table. Role management via a Route Handler using `firebase-admin` (bypasses Firestore rules, so the Route Handler must verify admin identity from headers before writing).
4. Admin request workflow — form on profile page or dedicated route.

**`/qa/[eventId]` status:** No impact.

**Done when:** Non-admin navigating to `/dashboard` is redirected server-side before page renders. Admin can view and update user roles.

---

### Phase 4 — Social Features
*Chat, DMs, notifications.*

**What gets built:**
1. Audit and resolve the chat collection path question (Section 6 Q6) — confirm web messages appear in mobile and vice versa.
2. Chat and DMs — replace client-side auth guard with server-side.
3. Notifications page — already cleaned in Phase 0 (debug buttons removed). Auth gate replaced here.
4. Push notifications — if required, implement FCM web push using `NEXT_PUBLIC_FIREBASE_VAPID_KEY` and a `public/firebase-messaging-sw.js` service worker.

**`/qa/[eventId]` status:** No impact.

**Done when:** A logged-in web user can send a message in an event group chat and it appears on mobile, and vice versa.

---

### Phase 5 — Deferred Features
*Polls, ratings. Each independently shippable.*

1. Polls — organisers create/close polls from manage page; attendees vote from event detail.
2. Ratings — attendees rate agenda sessions post-event.

**`/qa/[eventId]` status:** No impact.

---

## 6. What's Needed From the Owner

The following decisions must be resolved before Phase 0 begins.

**Auth:**

1. **Is email/password auth intentional for web?** The mobile app uses phone OTP only. The web has both. If email is for admin-only access, that should be explicit. If all users should be able to register with email on web, the profile creation flow for email users needs a phone number fallback (currently defaults to `""`).

2. **Should web users be able to register new accounts?** Or is the web app only for existing mobile users accessing additional features on desktop?

**Access:**

3. **Should the event list and event detail be publicly viewable without login?** The current Firestore rule requires `isAuthenticated()` for event reads. If events should be publicly browsable, either the rule needs a public read exception or the server render must use the Admin SDK. This is a product and security decision.

4. **Should web users be able to join events, or only view and organise?** The current implementation allows authenticated users to join open events. Confirm this is intentional.

5. **Should `/profile/[userId]` be publicly accessible without login?** If profiles should be shareable via URL, move to `(public)` group. If profiles are private to logged-in users, keep auth-gated.

**Data:**

6. **Which collection does the mobile app read for event group chat?** The web service writes to the flat `messages` collection with a `conversationId` field. The mobile `CLAUDE.md` mentions both `messages` (flat) and `chatRooms/{id}/messages` (subcollection). Messages from web may not appear in the mobile chat UI if they write to different paths. This must be confirmed by testing a web-to-mobile message before Phase 4 begins.

7. **Should the `/qa/[eventId]` display screen remain unauthenticated?** Confirmed correct behaviour for the conference room use case, but requires explicit acknowledgment since it relies on a public read rule in Firestore.

**Infrastructure:**

8. **Firebase service account for `firebase-admin`.** The rebuild requires server-side Firebase Admin credentials. The following env vars are needed (never prefixed `NEXT_PUBLIC_`, never committed to git, set in Vercel and `.env.local`):
   - Either `FIREBASE_SERVICE_ACCOUNT_JSON` (the full JSON blob as a string), or
   - `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (individual fields from the service account JSON).
   - `FIREBASE_PROJECT_ID` (server-side copy, not the public one).
   The service account JSON file already exists at `/Users/marcus/Downloads/nexvenue-2a4fa-firebase-adminsdk-fbsvc-5f1a32d723.json` from the earlier Firestore seeding work — the values can be taken from there.

9. **Is the web repo's `firestore.rules` ever deployed independently?** If yes, this is a critical security issue that must be resolved immediately, ahead of all other work. The web rules use permissive `allow read, write: if request.auth != null` on events and chat — deploying these would override the hardened mobile rules on the shared Firestore database.

10. **Firestore rules deployment ownership.** Who deploys rules changes — the mobile repo, the web repo, a CI pipeline? The answer determines the sync strategy for the web repo's rules copy.
