"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User as FirebaseUser,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { UserProfile, UserRole } from "@/types/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
    // Auth state
    user: FirebaseUser | null;
    profile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    isNewUser: boolean;

    // Phone OTP
    confirmationResult: ConfirmationResult | null;
    setConfirmationResult: (result: ConfirmationResult | null) => void;
    sendOtp: (phoneNumber: string, recaptchaContainerId: string) => Promise<void>;

    // Profile management
    fetchUserProfile: (uid: string) => Promise<UserProfile | null>;
    updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
    createUserProfile: (uid: string, data: Partial<UserProfile>) => Promise<UserProfile>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROFILE_CACHE_KEY = "nex_user_profile";

const cacheProfile = (profile: UserProfile) => {
    try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch { /* ignore */ }
};

const getCachedProfile = (): UserProfile | null => {
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const clearCachedProfile = () => {
    try {
        localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch { /* ignore */ }
};

const setAuthCookie = (hasUser: boolean) => {
    if (typeof document !== "undefined") {
        document.cookie = `nex_auth_session=${hasUser}; path=/; max-age=${hasUser ? 30 * 24 * 60 * 60 : 0}; SameSite=Lax`;
    }
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isNewUser: false,
    confirmationResult: null,
    setConfirmationResult: () => { },
    sendOtp: async () => { },
    fetchUserProfile: async () => null,
    updateUserProfile: async () => { },
    createUserProfile: async () => ({} as UserProfile),
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isNewUser, setIsNewUser] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // Computed
    const isAdmin = profile?.role === "admin";

    // ── Fetch or create Firestore user doc ──────────────────────────────────
    const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
        try {
            const userRef = doc(db, "users", uid);
            const snap = await getDoc(userRef);

            if (snap.exists()) {
                const data = snap.data() as UserProfile;
                // Backward-compat: ensure role exists
                if (!data.role) {
                    data.role = "user";
                    await updateDoc(userRef, { role: "user" });
                }
                setProfile(data);
                setIsNewUser(!data.profileComplete);
                cacheProfile(data);
                return data;
            }
            // Document doesn't exist yet — return null; caller creates it
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            // Fall back to cache only if it belongs to the same user
            const cached = getCachedProfile();
            if (cached && cached.uid === uid) {
                if (!cached.role) cached.role = "user";
                setProfile(cached);
            } else if (cached && cached.uid !== uid) {
                // Stale cache from a different account — discard it
                clearCachedProfile();
            }
            return null;
        }
    };

    // ── Create a new Firestore user doc ─────────────────────────────────────
    const createUserProfile = async (
        uid: string,
        data: Partial<UserProfile>
    ): Promise<UserProfile> => {
        const newProfile: UserProfile = {
            uid,
            phoneNumber: data.phoneNumber || "",
            role: (data.role as UserRole) || "user",
            createdAt: Date.now(),
            profileComplete: false,
            avatar: null,
            isOnline: true,
            lastSeen: Date.now(),
            ...data,
        };
        await setDoc(doc(db, "users", uid), newProfile);
        setProfile(newProfile);
        setIsNewUser(!newProfile.profileComplete);
        cacheProfile(newProfile);
        return newProfile;
    };

    // ── Update profile in Firestore + local state ────────────────────────────
    const updateUserProfile = async (data: Partial<UserProfile>) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.uid);
            const merged = { ...profile!, ...data } as UserProfile;
            // Auto-set profileComplete once name and avatar are both present
            if (merged.fullName && merged.avatar && !merged.profileComplete) {
                data.profileComplete = true;
                merged.profileComplete = true;
            }
            // Firestore rejects undefined values — strip them before writing
            const cleanData = Object.fromEntries(
                Object.entries({ ...data, lastSeen: Date.now() })
                    .filter(([, v]) => v !== undefined)
            );
            await updateDoc(userRef, cleanData);
            setProfile(merged);
            setIsNewUser(!merged.profileComplete);
            cacheProfile(merged);
        } catch (error) {
            console.error("Error updating user profile:", error);
            throw error;
        }
    };

    // ── Phone OTP ────────────────────────────────────────────────────────────
    const sendOtp = async (
        phoneNumber: string,
        recaptchaContainerId: string
    ): Promise<void> => {
        // Create an invisible reCAPTCHA — Firebase requires this for phone auth on web
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
            size: "invisible",
        });
        const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        setConfirmationResult(result);
    };

    // ── Auth state listener ───────────────────────────────────────────────────
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            setAuthCookie(!!firebaseUser);

            if (firebaseUser) {
                await fetchUserProfile(firebaseUser.uid);
            } else {
                setProfile(null);
                clearCachedProfile();
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                isAdmin,
                isNewUser,
                confirmationResult,
                setConfirmationResult,
                sendOtp,
                fetchUserProfile,
                updateUserProfile,
                createUserProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
