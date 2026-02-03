import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { UserProfile } from "@/types/auth";

export const authService = {
    // We match the mobile app's profile structure
    createUserProfile: async (uid: string, data: Partial<UserProfile>) => {
        const userRef = doc(db, "users", uid);
        const profile: UserProfile = {
            uid,
            phoneNumber: data.phoneNumber || "",
            fullName: data.fullName || "",
            email: data.email || "",
            role: data.role || "user",
            createdAt: Date.now(),
            profileComplete: true,
            avatar: null,
            isOnline: true,
            lastSeen: Date.now(),
            ...data
        };
        await setDoc(userRef, profile);
        return profile;
    },

    getUserProfile: async (uid: string) => {
        const userRef = doc(db, "users", uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            return snapshot.data() as UserProfile;
        }
        return null;
    }
};
