import { db } from "@/lib/firebase/config";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
} from "firebase/firestore";
import type { ConnectionRequest } from "@/types/connections";

// Web port of the mobile connectionService — same collection (connectionRequests),
// same rules-compliant query shapes. An accepted connection is what unlocks DMs.
export const connectionService = {
    async sendRequest(
        fromId: string,
        fromName: string,
        fromAvatar: string | null,
        toId: string,
        toName: string
    ): Promise<string> {
        // Look for any existing request between the pair, both directions (two
        // equality queries — Firestore allows only one disjunctive `in` per query).
        const [outSnap, inSnap] = await Promise.all([
            getDocs(query(collection(db, "connectionRequests"), where("fromId", "==", fromId), where("toId", "==", toId))),
            getDocs(query(collection(db, "connectionRequests"), where("fromId", "==", toId), where("toId", "==", fromId))),
        ]);
        const existing = [...outSnap.docs, ...inSnap.docs];
        if (existing.some((d) => d.data().status === "accepted")) {
            throw Object.assign(new Error("Already connected."), { code: "already_connected" });
        }
        if (existing.some((d) => d.data().status === "pending")) {
            throw Object.assign(new Error("A pending request already exists."), { code: "already_pending" });
        }
        const ref = await addDoc(collection(db, "connectionRequests"), {
            fromId,
            fromName,
            fromAvatar: fromAvatar ?? null,
            toId,
            toName,
            status: "pending",
            createdAt: Date.now(),
        });
        return ref.id;
    },

    async cancelRequest(requestId: string, fromId: string): Promise<void> {
        const ref = doc(db, "connectionRequests", requestId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Request not found");
        if (snap.data()?.fromId !== fromId) throw new Error("Not your request");
        await deleteDoc(ref);
    },

    async acceptRequest(requestId: string, toId: string): Promise<void> {
        const ref = doc(db, "connectionRequests", requestId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Request not found");
        if (snap.data()?.toId !== toId) throw new Error("Not your request to accept");
        await updateDoc(ref, { status: "accepted", respondedAt: Date.now() });
    },

    // Decline deletes the doc (like cancel) so there's at most one request per pair.
    async declineRequest(requestId: string, toId: string): Promise<void> {
        const ref = doc(db, "connectionRequests", requestId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Request not found");
        if (snap.data()?.toId !== toId) throw new Error("Not your request to decline");
        await deleteDoc(ref);
    },

    async getConnectionStatus(
        userId: string,
        otherId: string
    ): Promise<{ request: ConnectionRequest; direction: "outgoing" | "incoming" } | null> {
        const [outSnap, inSnap] = await Promise.all([
            getDocs(query(collection(db, "connectionRequests"), where("fromId", "==", userId), where("toId", "==", otherId))),
            getDocs(query(collection(db, "connectionRequests"), where("fromId", "==", otherId), where("toId", "==", userId))),
        ]);
        const candidates = [
            ...outSnap.docs.map((d) => ({ request: { id: d.id, ...d.data() } as ConnectionRequest, direction: "outgoing" as const })),
            ...inSnap.docs.map((d) => ({ request: { id: d.id, ...d.data() } as ConnectionRequest, direction: "incoming" as const })),
        ].filter((c) => c.request.status !== "declined");
        return (
            candidates.find((c) => c.request.status === "accepted") ??
            candidates.find((c) => c.request.status === "pending") ??
            null
        );
    },

    subscribeToConnectionStatus(
        userId: string,
        otherId: string,
        callback: (status: { request: ConnectionRequest; direction: "outgoing" | "incoming" } | null) => void
    ): () => void {
        let outDocs: ConnectionRequest[] = [];
        let inDocs: ConnectionRequest[] = [];
        const emit = () => {
            const candidates = [
                ...outDocs.map((r) => ({ request: r, direction: "outgoing" as const })),
                ...inDocs.map((r) => ({ request: r, direction: "incoming" as const })),
            ].filter((c) => c.request.status !== "declined");
            callback(
                candidates.find((c) => c.request.status === "accepted") ??
                candidates.find((c) => c.request.status === "pending") ??
                null
            );
        };
        const unsubOut = onSnapshot(
            query(collection(db, "connectionRequests"), where("fromId", "==", userId), where("toId", "==", otherId)),
            (snap) => { outDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ConnectionRequest)); emit(); },
            () => { outDocs = []; emit(); }
        );
        const unsubIn = onSnapshot(
            query(collection(db, "connectionRequests"), where("fromId", "==", otherId), where("toId", "==", userId)),
            (snap) => { inDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ConnectionRequest)); emit(); },
            () => { inDocs = []; emit(); }
        );
        return () => { unsubOut(); unsubIn(); };
    },

    subscribeToIncomingRequests(userId: string, callback: (requests: ConnectionRequest[]) => void): () => void {
        const q = query(
            collection(db, "connectionRequests"),
            where("toId", "==", userId),
            where("status", "==", "pending")
        );
        return onSnapshot(q, (snap) => {
            const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ConnectionRequest));
            requests.sort((a, b) => b.createdAt - a.createdAt);
            callback(requests);
        }, () => callback([]));
    },

    // Two rule-compliant listeners (fromId==me / toId==me) merged.
    subscribeToConnections(userId: string, callback: (connections: ConnectionRequest[]) => void): () => void {
        let outgoing: ConnectionRequest[] = [];
        let incoming: ConnectionRequest[] = [];
        const emit = () => {
            const merged = [...outgoing, ...incoming];
            merged.sort((a, b) => (b.respondedAt ?? b.createdAt) - (a.respondedAt ?? a.createdAt));
            callback(merged);
        };
        const unsubOut = onSnapshot(
            query(collection(db, "connectionRequests"), where("fromId", "==", userId), where("status", "==", "accepted")),
            (snap) => { outgoing = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ConnectionRequest)); emit(); },
            () => { outgoing = []; emit(); }
        );
        const unsubIn = onSnapshot(
            query(collection(db, "connectionRequests"), where("toId", "==", userId), where("status", "==", "accepted")),
            (snap) => { incoming = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ConnectionRequest)); emit(); },
            () => { incoming = []; emit(); }
        );
        return () => { unsubOut(); unsubIn(); };
    },
};
