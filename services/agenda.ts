import { db } from "@/lib/firebase/config";
import {
    collection,
    getDocs,
    query,
    where,
    onSnapshot,
    orderBy
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
    }
};
