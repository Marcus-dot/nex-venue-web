import { db } from "@/lib/firebase/config";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    limit,
    serverTimestamp
} from "firebase/firestore";
import { ChatMessage, ChatRoom, DirectConversation } from "@/types/chat";

export const chatService = {
    // === EVENT CHATS ===

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

    sendMessage: async (
        eventId: string,
        senderId: string,
        senderName: string,
        senderPhone: string,
        message: string
    ): Promise<string> => {
        try {
            const messageData: Omit<ChatMessage, 'id'> = {
                eventId,
                conversationId: eventId,
                senderId,
                senderName,
                senderPhone,
                message: message.trim(),
                timestamp: Date.now(),
                type: 'text'
            };

            const docRef = await addDoc(collection(db, "messages"), messageData);

            // Update room's last message
            const roomRef = doc(db, "chatRooms", eventId);
            await updateDoc(roomRef, {
                lastMessage: message.trim().substring(0, 50),
                lastMessageTimestamp: Date.now()
            }).catch(() => { }); // Ignore if room doesn't exist yet

            return docRef.id;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },

    // === DIRECT MESSAGING ===

    generateConversationId: (id1: string, id2: string) => {
        return [id1, id2].sort().join('_');
    },

    subscribeToDirectMessages: (conversationId: string, callback: (messages: ChatMessage[]) => void) => {
        const messagesRef = collection(db, "messages");
        const q = query(
            messagesRef,
            where("conversationId", "==", conversationId),
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

    sendDirectMessage: async (
        recipientId: string,
        senderId: string,
        senderName: string,
        senderPhone: string,
        recipientName: string,
        recipientPhone: string,
        message: string
    ) => {
        const conversationId = chatService.generateConversationId(senderId, recipientId);
        const timestamp = Date.now();

        const messageData: Omit<ChatMessage, 'id'> = {
            conversationId,
            senderId,
            senderName,
            senderPhone,
            message: message.trim(),
            timestamp,
            type: 'text'
        };

        const docRef = await addDoc(collection(db, "messages"), messageData);

        // Update conversation metadata
        const convRef = doc(db, "directConversations", conversationId);
        await setDoc(convRef, {
            id: conversationId,
            participants: [senderId, recipientId],
            participantDetails: {
                [senderId]: { name: senderName, phone: senderPhone },
                [recipientId]: { name: recipientName, phone: recipientPhone }
            },
            lastMessage: message.trim(),
            lastMessageTimestamp: timestamp,
            updatedAt: timestamp
        }, { merge: true });

        return docRef.id;
    },

    subscribeToMyConversations: (userId: string, callback: (conversations: DirectConversation[]) => void) => {
        const convRef = collection(db, "directConversations");
        const q = query(
            convRef,
            where("participants", "array-contains", userId),
            orderBy("updatedAt", "desc")
        );

        return onSnapshot(q, (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({
                ...doc.data()
            })) as DirectConversation[];
            callback(conversations);
        });
    },

    updateUserPresence: async (userId: string, isOnline: boolean) => {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            isOnline,
            lastSeen: Date.now()
        }).catch(() => { });
    }
};
