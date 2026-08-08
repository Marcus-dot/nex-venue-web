import { db } from "@/lib/firebase/config";
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    onSnapshot,
    arrayUnion,
} from "firebase/firestore";
import type { AttendanceRequest } from "@/types/events";

// Mirrors the mobile `attendanceRequestService` against the shared
// `attendanceRequests` collection so both apps stay compatible.
export const attendanceRequestService = {
    /** Submit an attendance request for a closed (approval-required) event. */
    createRequest: async (
        eventId: string,
        userId: string,
        userName: string,
        userPhone: string,
    ): Promise<void> => {
        // Block duplicate active (pending/approved) requests.
        const existing = await getDocs(
            query(
                collection(db, "attendanceRequests"),
                where("eventId", "==", eventId),
                where("userId", "==", userId),
            )
        );
        const active = existing.docs.find((d) => {
            const status = d.data().status;
            return status === "pending" || status === "approved";
        });
        if (active) {
            if (active.data().status === "pending") {
                throw new Error("You already have a pending request for this event.");
            }
            throw new Error("You are already approved to attend this event.");
        }

        await addDoc(collection(db, "attendanceRequests"), {
            eventId,
            userId,
            userName,
            userPhone,
            status: "pending",
            timestamp: Date.now(),
        });
    },

    /** Most recent attendance request for a user on an event (any status). */
    getUserRequest: async (eventId: string, userId: string): Promise<AttendanceRequest | null> => {
        try {
            const snapshot = await getDocs(
                query(
                    collection(db, "attendanceRequests"),
                    where("eventId", "==", eventId),
                    where("userId", "==", userId),
                )
            );
            if (snapshot.empty) return null;
            const sorted = snapshot.docs
                .slice()
                .sort((a, b) => (b.data().timestamp ?? 0) - (a.data().timestamp ?? 0));
            const d = sorted[0];
            return { id: d.id, ...d.data() } as AttendanceRequest;
        } catch (error) {
            console.error("Error fetching attendance request:", error);
            return null;
        }
    },

    /** Real-time pending requests for organisers. Sorted oldest-first. */
    subscribeToEventRequests: (
        eventId: string,
        callback: (requests: AttendanceRequest[]) => void
    ): (() => void) => {
        const q = query(
            collection(db, "attendanceRequests"),
            where("eventId", "==", eventId),
            where("status", "==", "pending"),
        );
        return onSnapshot(
            q,
            (snapshot) => {
                const requests = snapshot.docs
                    .map((d) => ({ id: d.id, ...d.data() }) as AttendanceRequest)
                    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
                callback(requests);
            },
            () => callback([])
        );
    },

    /**
     * Approve: add the user to the event's attendees[] and mark approved.
     * Enforces the capacity cap so approvals can't exceed maxAttendees.
     */
    approveRequest: async (request: AttendanceRequest): Promise<void> => {
        const eventRef = doc(db, "events", request.eventId);
        const requestRef = doc(db, "attendanceRequests", request.id);

        const eventSnap = await getDoc(eventRef);
        const eventData = eventSnap.data();
        const attendees: string[] = eventData?.attendees ?? [];
        const max: number | undefined = eventData?.maxAttendees;
        if (max && attendees.length >= max && !attendees.includes(request.userId)) {
            throw Object.assign(new Error("This event is at full capacity."), { code: "event_full" });
        }

        await Promise.all([
            updateDoc(eventRef, { attendees: arrayUnion(request.userId) }),
            updateDoc(requestRef, { status: "approved" }),
        ]);
    },

    /** Reject: mark the request rejected. */
    rejectRequest: async (requestId: string): Promise<void> => {
        await updateDoc(doc(db, "attendanceRequests", requestId), { status: "rejected" });
    },
};
