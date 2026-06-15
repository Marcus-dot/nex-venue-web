import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

// firebase-admin requires Node.js APIs — cannot run on Edge runtime.
export const runtime = "nodejs";

const SESSION_COOKIE = "nex_session";

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

    // No cookie — redirect immediately, no Firebase round-trip needed
    if (!sessionCookie) {
        return redirectToLogin(request);
    }

    try {
        // Verifies signature, expiry, and revocation status
        const decoded = await adminAuth.verifySessionCookie(
            sessionCookie,
            true // checkRevoked — catches manually invalidated sessions
        );

        // Forward uid to Server Components via request header.
        // Role is not checked here — Server Components read it from Firestore
        // or custom claims when needed (Phase 3 admin routes).
        const headers = new Headers(request.headers);
        headers.set("x-nex-uid", decoded.uid);
        return NextResponse.next({ request: { headers } });

    } catch {
        // Expired, revoked, or tampered cookie — treat as unauthenticated
        return redirectToLogin(request);
    }
}

function redirectToLogin(request: NextRequest): NextResponse {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
}

export const config = {
    matcher: [
        // Middleware runs on these paths ONLY.
        // Anything not listed — /qa/*, /api/*, /, /events, /events/[id],
        // /login, /register, /profile-setup, and all static assets —
        // never enters middleware. /qa/* is structurally absent, not conditionally skipped.
        "/dashboard/:path*",
        "/events/create",
        "/events/:eventId/manage/:path*",
        "/events/:eventId/edit/:path*",
        "/events/:eventId/special-access/:path*",
        "/profile/:path*",
        "/settings/:path*",
        "/chat/:path*",
        "/notifications/:path*",
    ],
};
