import { db } from "@/lib/firebase/config";
import {
    doc,
    getDoc,
    getDocs,
    updateDoc,
    arrayUnion,
    arrayRemove,
    collection,
    query,
    where,
    documentId,
} from "firebase/firestore";
import type { UserProfile } from "@/types/auth";

// Minimal shape rendered in the blocked-users list.
export interface BlockedUserSummary {
    uid: string;
    fullName: string;
    avatar: string | null;
    company?: string;
}

export const blockService = {
    /** Block a user: add their uid to the current user's blockedUsers array. */
    async blockUser(currentUserId: string, targetUserId: string): Promise<void> {
        await updateDoc(doc(db, "users", currentUserId), {
            blockedUsers: arrayUnion(targetUserId),
        });
    },

    /** Unblock a user. */
    async unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
        await updateDoc(doc(db, "users", currentUserId), {
            blockedUsers: arrayRemove(targetUserId),
        });
    },

    /**
     * True if either party has blocked the other. Use to gate messaging and
     * connection requests.
     */
    async isBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
        const [currentDoc, targetDoc] = await Promise.all([
            getDoc(doc(db, "users", currentUserId)),
            getDoc(doc(db, "users", targetUserId)),
        ]);
        const currentBlocked: string[] = currentDoc.data()?.blockedUsers ?? [];
        const targetBlocked: string[] = targetDoc.data()?.blockedUsers ?? [];
        return currentBlocked.includes(targetUserId) || targetBlocked.includes(currentUserId);
    },

    /** One-directional check against an already-loaded blockedUsers array. */
    hasBlocked(blockedUsers: string[] | undefined, targetUserId: string): boolean {
        return !!blockedUsers?.includes(targetUserId);
    },

    /**
     * Resolve blocked uids to display summaries for the settings list.
     * Batches into `documentId in` chunks of 30 (Firestore limit).
     */
    async getBlockedProfiles(uids: string[]): Promise<BlockedUserSummary[]> {
        if (!uids.length) return [];
        const chunks: string[][] = [];
        for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));

        const results = await Promise.all(
            chunks.map((chunk) =>
                getDocs(query(collection(db, "users"), where(documentId(), "in", chunk)))
            )
        );

        return results.flatMap((snap) =>
            snap.docs.map((d) => {
                const p = d.data() as UserProfile;
                return {
                    uid: d.id,
                    fullName: p.fullName || "Unknown User",
                    avatar: p.avatar ?? null,
                    company: p.company,
                };
            })
        );
    },
};
