import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, documentId, orderBy } from "firebase/firestore";
import type { UserProfile, UserRole } from "@/types/auth";

// Lightweight user card used for pickers and linked-speaker rendering.
export interface UserSummary {
    uid: string;
    fullName: string;
    avatar: string | null;
    jobTitle?: string;
    company?: string;
}

// Full-ish record for the admin user-management screen.
export interface UserRecord {
    uid: string;
    fullName: string;
    phoneNumber: string;
    avatar: string | null;
    role: UserRole;
    createdAt?: number;
}

const toSummary = (uid: string, p: UserProfile): UserSummary => ({
    uid,
    fullName: p.fullName || "Unknown User",
    avatar: p.avatar ?? null,
    jobTitle: p.jobTitle,
    company: p.company,
});

export const usersService = {
    /**
     * Batch-resolve uids to summaries, keyed by uid. Chunks into
     * `documentId in` queries of 30 (Firestore limit). Missing uids are omitted.
     */
    getUserSummaries: async (uids: string[]): Promise<Record<string, UserSummary>> => {
        const unique = Array.from(new Set(uids)).filter(Boolean);
        if (unique.length === 0) return {};

        const chunks: string[][] = [];
        for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30));

        const snaps = await Promise.all(
            chunks.map((chunk) =>
                getDocs(query(collection(db, "users"), where(documentId(), "in", chunk)))
            )
        );

        const map: Record<string, UserSummary> = {};
        snaps.forEach((snap) =>
            snap.docs.forEach((d) => { map[d.id] = toSummary(d.id, d.data() as UserProfile); })
        );
        return map;
    },

    /** All users, ordered by name — for the admin user-management screen. */
    getAllUsers: async (): Promise<UserRecord[]> => {
        const snap = await getDocs(query(collection(db, "users"), orderBy("fullName")));
        return snap.docs.map((d) => {
            const p = d.data() as UserProfile;
            return {
                uid: d.id,
                fullName: p.fullName || "Unknown User",
                phoneNumber: p.phoneNumber || "",
                avatar: p.avatar ?? null,
                role: (p.role as UserRole) ?? "user",
                createdAt: p.createdAt,
            };
        });
    },
};
