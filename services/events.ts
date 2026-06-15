import { db } from "@/lib/firebase/config";
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    where,
    limit,
    deleteDoc,
    arrayUnion,
    arrayRemove,
    onSnapshot,
    startAfter,
    DocumentSnapshot,
    setDoc
} from "firebase/firestore";
import { Event, RoleRequest, EventParticipant, EventRole } from "@/types/events";

export const eventService = {
    getAllEvents: async (count: number = 20, lastVisible?: DocumentSnapshot): Promise<{ events: Event[], lastDoc: DocumentSnapshot | null }> => {
        try {
            const eventsRef = collection(db, "events");
            let q = query(eventsRef, orderBy("createdAt", "desc"), limit(count));
            if (lastVisible) {
                q = query(eventsRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(count));
            }
            const snapshot = await getDocs(q);
            const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Event));
            return {
                events,
                lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
            };
        } catch (error) {
            console.error("Error fetching all events:", error);
            return { events: [], lastDoc: null };
        }
    },

    getEventById: async (id: string): Promise<Event | null> => {
        try {
            const eventRef = doc(db, "events", id);
            const snapshot = await getDoc(eventRef);
            if (snapshot.exists()) {
                return { id: snapshot.id, ...snapshot.data() } as Event;
            }
            return null;
        } catch (error) {
            console.error("Error fetching event by id:", error);
            return null;
        }
    },

    getEventsByCreator: async (creatorId: string): Promise<Event[]> => {
        try {
            const eventsRef = collection(db, "events");
            const q = query(eventsRef, where("creatorId", "==", creatorId), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Event));
        } catch (error) {
            console.error("Error fetching creator events:", error);
            return [];
        }
    },

    getAttendingEvents: async (userId: string): Promise<Event[]> => {
        try {
            const eventsRef = collection(db, "events");
            const q = query(eventsRef, where("attendees", "array-contains", userId), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Event));
        } catch (error) {
            console.error("Error fetching attending events:", error);
            return [];
        }
    },

    // === WRITE OPERATIONS ===

    createEvent: async (eventData: Omit<Event, "id" | "createdAt" | "attendees" | "organisers" | "speakers" | "exhibitors">): Promise<string> => {
        try {
            const newEvent = {
                ...eventData,
                attendees: [eventData.creatorId], // Creator attends by default
                organisers: [eventData.creatorId], // Creator is an organiser by default
                speakers: [],
                exhibitors: [],
                createdAt: Date.now()
            };
            const docRef = await addDoc(collection(db, "events"), newEvent);

            // Create participant record for the creator as an organiser
            const participantRef = doc(db, "events", docRef.id, "participants", eventData.creatorId);
            await setDoc(participantRef, {
                id: eventData.creatorId,
                eventId: docRef.id,
                role: 'organiser',
                displayName: eventData.creatorName,
                bio: "",
                boothDetails: "",
                company: "",
                timestamp: Date.now()
            });

            return docRef.id;
        } catch (error) {
            console.error("Error creating event:", error);
            throw error;
        }
    },

    updateEvent: async (id: string, eventData: Partial<Event>): Promise<void> => {
        try {
            const eventRef = doc(db, "events", id);
            await updateDoc(eventRef, eventData);
        } catch (error) {
            console.error("Error updating event:", error);
            throw error;
        }
    },

    deleteEvent: async (id: string): Promise<void> => {
        try {
            // Note: In a real app we'd also need to delete associated subcollections (agenda, messages)
            // and maybe imagery from Storage. This is a basic document delete.
            const eventRef = doc(db, "events", id);
            await deleteDoc(eventRef);
        } catch (error) {
            console.error("Error deleting event:", error);
            throw error;
        }
    },

    // === RSVP / ATTENDANCE ===

    joinEvent: async (eventId: string, userId: string): Promise<void> => {
        try {
            const eventRef = doc(db, "events", eventId);
            await updateDoc(eventRef, {
                attendees: arrayUnion(userId)
            });
        } catch (error) {
            console.error("Error joining event:", error);
            throw error;
        }
    },

    leaveEvent: async (eventId: string, userId: string): Promise<void> => {
        try {
            const eventRef = doc(db, "events", eventId);
            await updateDoc(eventRef, {
                attendees: arrayRemove(userId)
            });
        } catch (error) {
            console.error("Error leaving event:", error);
            throw error;
        }
    },

    // === REAL-TIME SUBSCRIPTIONS ===

    subscribeToEvent: (id: string, callback: (event: Event | null) => void) => {
        const eventRef = doc(db, "events", id);
        return onSnapshot(eventRef, (snapshot) => {
            if (snapshot.exists()) {
                callback({ id: snapshot.id, ...snapshot.data() } as Event);
            } else {
                callback(null);
            }
        });
    },

    // === ROLE MANAGEMENT ===

    requestEventRole: async (request: Omit<RoleRequest, 'id' | 'status' | 'timestamp'>): Promise<string> => {
        try {
            const raw = { ...request, status: 'pending' as const, timestamp: Date.now() };
            // Firestore rejects undefined values — strip before writing
            const requestData = Object.fromEntries(
                Object.entries(raw).filter(([, v]) => v !== undefined)
            );
            const docRef = await addDoc(collection(db, "roleRequests"), requestData);
            return docRef.id;
        } catch (error) {
            console.error("Error requesting role:", error);
            throw error;
        }
    },

    getRoleRequests: (eventId: string, callback: (requests: RoleRequest[]) => void) => {
        const requestsRef = collection(db, "roleRequests");
        const q = query(
            requestsRef,
            where("eventId", "==", eventId),
            where("status", "==", "pending"),
            orderBy("timestamp", "desc")
        );

        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RoleRequest[];
            callback(requests);
        });
    },

    approveRoleRequest: async (requestId: string): Promise<void> => {
        try {
            const requestRef = doc(db, "roleRequests", requestId);
            const requestSnap = await getDoc(requestRef);
            if (!requestSnap.exists()) throw new Error("Request not found");

            const request = requestSnap.data() as RoleRequest;
            const eventRef = doc(db, "events", request.eventId);

            // 1. Update the correct array in the Event document
            const fieldMap: Record<EventRole, string> = {
                'organiser': 'organisers',
                'speaker': 'speakers',
                'exhibitor': 'exhibitors'
            };

            const arrayField = fieldMap[request.requestedRole];
            await updateDoc(eventRef, {
                [arrayField]: arrayUnion(request.userId),
                attendees: arrayUnion(request.userId) // Ensure they are attendees too
            });

            // 2. Create the participant profile metadata record
            const participantRef = doc(db, "events", request.eventId, "participants", request.userId);
            const rawParticipant = {
                id: request.userId,
                eventId: request.eventId,
                role: request.requestedRole,
                displayName: request.userName,
                bio: "",
                boothDetails: "",
                company: "",
                photoUrl: undefined,
                timestamp: Date.now()
            };
            const participantData = Object.fromEntries(
                Object.entries(rawParticipant).filter(([, v]) => v !== undefined)
            );
            await setDoc(participantRef, participantData);

            // 3. Update request status
            await updateDoc(requestRef, { status: 'approved' });
        } catch (error) {
            console.error("Error approving role request:", error);
            throw error;
        }
    },

    rejectRoleRequest: async (requestId: string): Promise<void> => {
        try {
            const requestRef = doc(db, "roleRequests", requestId);
            await updateDoc(requestRef, { status: 'rejected' });
        } catch (error) {
            console.error("Error rejecting role request:", error);
            throw error;
        }
    },

    getParticipantProfile: async (eventId: string, userId: string): Promise<EventParticipant | null> => {
        try {
            const pRef = doc(db, "events", eventId, "participants", userId);
            const snap = await getDoc(pRef);
            return snap.exists() ? (snap.data() as EventParticipant) : null;
        } catch (error) {
            console.error("Error fetching participant profile:", error);
            return null;
        }
    },

    updateParticipantProfile: async (eventId: string, userId: string, data: Partial<EventParticipant>): Promise<void> => {
        try {
            const pRef = doc(db, "events", eventId, "participants", userId);
            await updateDoc(pRef, data);
        } catch (error) {
            console.error("Error updating participant profile:", error);
            throw error;
        }
    },

    getEventParticipants: async (eventId: string): Promise<EventParticipant[]> => {
        try {
            const participantsRef = collection(db, "events", eventId, "participants");
            const snapshot = await getDocs(participantsRef);
            return snapshot.docs.map(doc => ({
                ...doc.data()
            })) as EventParticipant[];
        } catch (error) {
            console.error("Error fetching event participants:", error);
            return [];
        }
    },

    revokeRole: async (eventId: string, userId: string, role: EventRole): Promise<void> => {
        try {
            const fieldMap: Record<EventRole, string> = {
                organiser: "organisers",
                speaker: "speakers",
                exhibitor: "exhibitors",
            };
            const eventRef = doc(db, "events", eventId);
            await updateDoc(eventRef, {
                [fieldMap[role]]: arrayRemove(userId),
            });
            // Remove participant profile record
            const participantRef = doc(db, "events", eventId, "participants", userId);
            await deleteDoc(participantRef);
        } catch (error) {
            console.error("Error revoking role:", error);
            throw error;
        }
    },
};
