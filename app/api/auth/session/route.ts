import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

// firebase-admin uses Node.js crypto APIs — must not run on Edge runtime.
export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "nex_session";
const EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 days in ms
const EXPIRES_IN_S  = EXPIRES_IN_MS / 1000;      // 432 000 — cookie maxAge

export async function POST(req: NextRequest) {
    const body = await req.json();
    const idToken: unknown = body?.idToken;

    if (!idToken || typeof idToken !== "string") {
        return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the ID token first — rejects expired, revoked, or forged tokens
    try {
        await adminAuth.verifyIdToken(idToken);
    } catch {
        return NextResponse.json(
            { error: "Invalid or expired ID token" },
            { status: 401 }
        );
    }

    // Exchange for a server-managed Firebase session cookie
    let sessionCookie: string;
    try {
        sessionCookie = await adminAuth.createSessionCookie(idToken, {
            expiresIn: EXPIRES_IN_MS,
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to create session cookie" },
            { status: 500 }
        );
    }

    const res = NextResponse.json({ status: "ok" });
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: EXPIRES_IN_S,
        path: "/",
    });
    return res;
}

export async function DELETE() {
    // Clears the session cookie unconditionally — no auth check needed to log out
    const res = NextResponse.json({ status: "ok" });
    res.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
    });
    return res;
}
