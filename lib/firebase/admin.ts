import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
    throw new Error(
        "Missing required environment variable: FIREBASE_SERVICE_ACCOUNT_JSON. " +
        "Set it in .env.local (local) and in Vercel environment variables (production). " +
        "Never prefix it with NEXT_PUBLIC_."
    );
}

let serviceAccount: object;
try {
    serviceAccount = JSON.parse(raw);
} catch {
    throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but could not be parsed as JSON. " +
        "Ensure the value is a valid JSON string (the full service account object)."
    );
}

const adminApp =
    getApps().length > 0
        ? getApps()[0]!
        : initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
