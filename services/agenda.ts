import { db } from "@/lib/firebase/config";
import {
    collection,
    getDocs,
    query,
    where,
    onSnapshot,
    orderBy,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    arrayUnion,
    arrayRemove
} from "firebase/firestore";
import { AgendaItem } from "@/types/agenda";

// Helper function to convert date + time to sortable timestamp (copied logic from mobile)
const parseDateTime = (date: string, time: string): number => {
    try {
        let parsedDate = new Date(date);
        const timeStr = time.toLowerCase().replace(/\s+/g, '');
        let hours = 0;
        let minutes = 0;

        if (timeStr.includes('am') || timeStr.includes('pm')) {
            const isPM = timeStr.includes('pm');
            const cleanTime = timeStr.replace(/[ap]m/g, '');
            const [hourStr, minuteStr] = cleanTime.split(':');
            hours = parseInt(hourStr);
            minutes = parseInt(minuteStr) || 0;
            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
        } else {
            const [hourStr, minuteStr] = time.split(':');
            hours = parseInt(hourStr);
            minutes = parseInt(minuteStr) || 0;
        }
        parsedDate.setHours(hours, minutes, 0, 0);
        return parsedDate.getTime();
    } catch (error) {
        return Date.now();
    }
};

const sortAgendaItems = (items: AgendaItem[]): AgendaItem[] => {
    return items.sort((a, b) => {
        const timestampA = parseDateTime(a.date, a.startTime);
        const timestampB = parseDateTime(b.date, b.startTime);
        if (timestampA !== timestampB) return timestampA - timestampB;
        return a.createdAt - b.createdAt;
    });
};

export const agendaService = {
    getEventAgenda: async (eventId: string): Promise<AgendaItem[]> => {
        try {
            const agendasRef = collection(db, "agendas");
            const q = query(agendasRef, where("eventId", "==", eventId));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AgendaItem[];
            return sortAgendaItems(items);
        } catch (error) {
            console.error("Error fetching agenda:", error);
            return [];
        }
    },

    subscribeToAgenda: (eventId: string, callback: (items: AgendaItem[]) => void) => {
        const agendasRef = collection(db, "agendas");
        const q = query(agendasRef, where("eventId", "==", eventId));

        return onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AgendaItem[];
            callback(sortAgendaItems(items));
        });
    },

    // === WRITE OPERATIONS / ADMIN ===

    createAgendaItem: async (itemData: Omit<AgendaItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "lastEditedBy"> & { createdBy?: string, lastEditedBy?: string }): Promise<string> => {
        try {
            const newItem = {
                ...itemData,
                order: itemData.order ?? 0,
                updatedAt: Date.now(),
                createdAt: Date.now(),
                lastEditedBy: itemData.lastEditedBy || "system",
                createdBy: itemData.createdBy || "system",
            } as AgendaItem;
            const agendasRef = collection(db, "agendas");
            const docRef = await addDoc(agendasRef, newItem);
            return docRef.id;
        } catch (error) {
            console.error("Error creating agenda item:", error);
            throw error;
        }
    },

    updateAgendaItem: async (id: string, itemData: Partial<AgendaItem>): Promise<void> => {
        try {
            const itemRef = doc(db, "agendas", id);
            await updateDoc(itemRef, itemData);
        } catch (error) {
            console.error("Error updating agenda item:", error);
            throw error;
        }
    },

    deleteAgendaItem: async (id: string): Promise<void> => {
        try {
            const itemRef = doc(db, "agendas", id);
            await deleteDoc(itemRef);
        } catch (error) {
            console.error("Error deleting agenda item:", error);
            throw error;
        }
    },

    setCurrentAgendaItem: async (eventId: string, itemId: string | null): Promise<void> => {
        try {
            const eventRef = doc(db, "events", eventId);
            await updateDoc(eventRef, {
                currentAgendaItem: itemId || null,
                agendaLastUpdated: Date.now()
            });
        } catch (error) {
            console.error("Error updating current agenda item:", error);
            throw error;
        }
    },

    selectSimultaneousEvent: async (eventId: string, itemId: string, userId: string, simultaneousGroupId: string): Promise<void> => {
        try {
            // First, find all agenda items in this group
            const agendasRef = collection(db, "agendas");
            const q = query(
                agendasRef, 
                where("eventId", "==", eventId),
                where("simultaneousGroupId", "==", simultaneousGroupId)
            );
            
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            
            // Remove user from all other items in the group, add to the selected one
            snapshot.docs.forEach((document) => {
                const ref = doc(db, "agendas", document.id);
                if (document.id === itemId) {
                    batch.update(ref, { attendeeSelections: arrayUnion(userId) });
                } else {
                    batch.update(ref, { attendeeSelections: arrayRemove(userId) });
                }
            });
            
            await batch.commit();
        } catch (error) {
            console.error("Error selecting simultaneous event:", error);
            throw error;
        }
    }
};
