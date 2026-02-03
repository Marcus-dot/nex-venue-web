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
    limit
} from "firebase/firestore";
import { Event } from "@/types/events";

export const eventService = {
    getAllEvents: async (count: number = 20): Promise<Event[]> => {
        try {
            const eventsRef = collection(db, "events");
            const q = query(eventsRef, orderBy("createdAt", "desc"), limit(count));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Event));
        } catch (error) {
            console.error("Error fetching all events:", error);
            return [];
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
    }
};
