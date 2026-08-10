import { db } from "@/lib/firebase/config";
import {
    doc,
    setDoc,
    deleteDoc,
    getDoc,
    collection,
    query,
    where,
    onSnapshot,
} from "firebase/firestore";
import type { CheckIn } from "@/types/checkins";

const checkInId = (eventId: string, uid: string) => `${eventId}_${uid}`;

// QR payload the attendee ticket encodes and the organiser scanner parses.
// Kept byte-identical to the mobile app so a web ticket scans in-app and vice versa.
export const buildCheckInPayload = (eventId: string, uid: string) => `nexvenue:checkin:${eventId}:${uid}`;

export const checkInService = {
    /**
     * Mark an attendee checked in. Idempotent — the doc id is deterministic, so
     * checking the same person twice overwrites with the same data.
     */
    async checkIn(eventId: string, uid: string, name: string, byUid: string): Promise<void> {
        await setDoc(doc(db, "checkIns", checkInId(eventId, uid)), {
            eventId,
            uid,
            name,
            checkedInAt: Date.now(),
            checkedInBy: byUid,
        });
    },

    /** Undo a check-in. */
    async undoCheckIn(eventId: string, uid: string): Promise<void> {
        await deleteDoc(doc(db, "checkIns", checkInId(eventId, uid)));
    },

    /** One-off read of a single attendee's check-in state. */
    async getCheckIn(eventId: string, uid: string): Promise<CheckIn | null> {
        const snap = await getDoc(doc(db, "checkIns", checkInId(eventId, uid)));
        return snap.exists() ? ({ id: snap.id, ...snap.data() } as CheckIn) : null;
    },

    /** Real-time subscription to all check-ins for an event (newest first). */
    subscribeToCheckIns(eventId: string, callback: (checkIns: CheckIn[]) => void): () => void {
        const q = query(collection(db, "checkIns"), where("eventId", "==", eventId));
        return onSnapshot(
            q,
            (snap) => {
                const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CheckIn);
                items.sort((a, b) => b.checkedInAt - a.checkedInAt);
                callback(items);
            },
            () => callback([])
        );
    },
};
