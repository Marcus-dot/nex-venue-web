import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protected routes: any user that is NOT authenticated is redirected to /login.
 * Admin-only routes are enforced client-side via isAdmin (Firestore role check).
 * 
 * NOTE: Firebase auth state is client-side only, so we use a session cookie
 * strategy here — we check for the existence of a Firebase auth cookie that
 * indicates the user has an active session. For full SSR protection, a
 * server-side Firebase Admin SDK verification would be needed (Phase 4).
 */

// Routes that require authentication
const PROTECTED_PREFIXES = [
    "/dashboard",
    "/events/create",
    "/profile",
    "/chat",
    "/notifications",
    "/manage",
];

// Routes that should redirect to /events if already authenticated
const AUTH_ONLY_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // We check for a lightweight auth session cookie set by AuthContext.
    const hasAuthCookie = request.cookies.get("nex_auth_session")?.value === "true";

    // Redirect unauthenticated users away from protected routes
    const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
    );
    if (isProtected && !hasAuthCookie) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - API routes
         * - Public assets
         */
        "/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).+)",
    ],
};
