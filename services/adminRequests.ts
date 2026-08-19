import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDocs,
    query,
    where,
    onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// Mirrors the mobile `adminRequests` collection/service exactly (shared Firestore).
export type AdminRequestStatus = "pending" | "approved" | "rejected";

export interface AdminRequest {
    id: string;
    userId: string;
    userName: string;
    userPhone: string;
    reason: string;
    status: AdminRequestStatus;
    timestamp: number;
    reviewedAt?: number;
    reviewedBy?: string;
}

export const adminRequestService = {
    // Submit a request for admin access (blocks duplicate pending requests).
    createRequest: async (
        userId: string,
        userName: string,
        userPhone: string,
        reason: string
    ): Promise<void> => {
        const existing = await getDocs(
            query(
                collection(db, "adminRequests"),
                where("userId", "==", userId),
                where("status", "==", "pending")
            )
        );
        if (!existing.empty) {
            throw new Error("You already have a pending admin request. Please wait for a decision.");
        }
        await addDoc(collection(db, "adminRequests"), {
            userId,
            userName,
            userPhone,
            reason,
            status: "pending",
            timestamp: Date.now(),
        });
    },

    // A user's most recent request (any status).
    getUserRequest: async (userId: string): Promise<AdminRequest | null> => {
        try {
            const snapshot = await getDocs(
                query(collection(db, "adminRequests"), where("userId", "==", userId))
            );
            if (snapshot.empty) return null;
            const sorted = snapshot.docs
                .slice()
                .sort((a, b) => (b.data().timestamp ?? 0) - (a.data().timestamp ?? 0));
            const d = sorted[0];
            return { id: d.id, ...d.data() } as AdminRequest;
        } catch (error) {
            console.error("Error fetching admin request:", error);
            return null;
        }
    },

    // Real-time listener for pending requests (admin only).
    // No orderBy — sorted in memory to avoid a composite index.
    subscribeToPendingRequests: (
        callback: (requests: AdminRequest[]) => void
    ): (() => void) => {
        const q = query(collection(db, "adminRequests"), where("status", "==", "pending"));
        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() }) as AdminRequest)
                .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
            callback(requests);
        });
    },

    // Approve: promote the user to admin + mark the request approved.
    approveRequest: async (request: AdminRequest, reviewerUid: string): Promise<void> => {
        await Promise.all([
            updateDoc(doc(db, "users", request.userId), { role: "admin" }),
            updateDoc(doc(db, "adminRequests", request.id), {
                status: "approved",
                reviewedAt: Date.now(),
                reviewedBy: reviewerUid,
            }),
        ]);
    },

    // Reject: mark the request rejected.
    rejectRequest: async (requestId: string, reviewerUid: string): Promise<void> => {
        await updateDoc(doc(db, "adminRequests", requestId), {
            status: "rejected",
            reviewedAt: Date.now(),
            reviewedBy: reviewerUid,
        });
    },
};
