import { db } from "@/lib/firebase/config";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc
} from "firebase/firestore";
import { ChatMessage } from "@/types/chat";

export const chatService = {
    // Listen to real-time messages for an event
    subscribeToMessages: (eventId: string, callback: (messages: ChatMessage[]) => void) => {
        const messagesRef = collection(db, "messages");
        const q = query(
            messagesRef,
            where("eventId", "==", eventId),
            orderBy("timestamp", "asc")
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[];
            callback(messages);
        });
    },

    // Send a message
    sendMessage: async (
        eventId: string,
        senderId: string,
        senderName: string,
        message: string
    ): Promise<string> => {
        try {
            const messageData: Omit<ChatMessage, 'id'> = {
                eventId,
                conversationId: eventId,
                senderId,
                senderName,
                senderPhone: "", // Optional for web
                message: message.trim(),
                timestamp: Date.now(),
                type: 'text'
            };

            const docRef = await addDoc(collection(db, "messages"), messageData);

            // We could also update chatRoom activity here if we were using it for search/list
            return docRef.id;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
};
