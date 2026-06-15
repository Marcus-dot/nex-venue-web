import { auth, db } from "@/lib/firebase/config";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { UserProfile } from "@/types/auth";

export const authService = {
    // ── Email / Password ────────────────────────────────────────────────────

    signInWithEmail: async (email: string, password: string) => {
        return signInWithEmailAndPassword(auth, email, password);
    },

    registerWithEmail: async (
        email: string,
        password: string,
        fullName: string
    ) => {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        // Set Firebase displayName too (optional but useful)
        await updateProfile(user, { displayName: fullName });
        return user;
    },

    // ── Firestore Profile ────────────────────────────────────────────────────

    /**
     * Creates the Firestore user document. Matches the mobile app's UserProfile shape exactly.
     * For email users, phoneNumber defaults to "". For phone users, email defaults to "".
     */
    createUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<UserProfile> => {
        const profile: UserProfile = {
            uid,
            phoneNumber: data.phoneNumber || "",
            fullName: data.fullName || "",
            email: data.email || "",
            role: data.role || "user",
            createdAt: Date.now(),
            profileComplete: data.profileComplete ?? false,
            avatar: data.avatar ?? null,
            isOnline: true,
            lastSeen: Date.now(),
            ...data,
        };
        await setDoc(doc(db, "users", uid), profile);
        return profile;
    },

    getUserProfile: async (uid: string): Promise<UserProfile | null> => {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) return snap.data() as UserProfile;
        return null;
    },

    updateUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
        await updateDoc(doc(db, "users", uid), { ...data, lastSeen: Date.now() });
    },

    // ── Presence ─────────────────────────────────────────────────────────────

    setOnlineStatus: async (uid: string, isOnline: boolean): Promise<void> => {
        try {
            await updateDoc(doc(db, "users", uid), {
                isOnline,
                lastSeen: Date.now(),
            });
        } catch { /* ignore — user may not have a profile yet */ }
    },

    // ── Sign Out ─────────────────────────────────────────────────────────────

    signOut: async () => {
        await firebaseSignOut(auth);
    },
};
