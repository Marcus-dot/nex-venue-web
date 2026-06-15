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
    serverTimestamp,
    documentId
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
        }, (error) => {
            if (error.code === 'permission-denied') return; // Ignore on logout
            console.error("Error subscribing to event messages:", error);
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
                lastMessage: {
                    ...messageData,
                    id: docRef.id
                },
                lastActivity: Date.now()
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
        }, (error) => {
            if (error.code === 'permission-denied') return; // Ignore on logout
            console.error("Error subscribing to direct messages:", error);
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
            participantNames: {
                [senderId]: senderName,
                [recipientId]: recipientName
            },
            participantPhones: {
                [senderId]: senderPhone,
                [recipientId]: recipientPhone
            },
            lastMessage: {
                ...messageData,
                id: docRef.id
            },
            lastActivity: timestamp,
            isActive: true, // Assuming isActive should be true when sending a message
            createdAt: timestamp // In real app, we'd preserve createdAt if it exists
        }, { merge: true });

        return docRef.id;
    },

    subscribeToMyConversations: (userId: string, callback: (conversations: DirectConversation[]) => void) => {
        const convRef = collection(db, "directConversations");
        const q = query(
            convRef,
            where("participants", "array-contains", userId),
            orderBy("lastActivity", "desc")
        );

        return onSnapshot(q, (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({
                ...doc.data()
            })) as DirectConversation[];
            callback(conversations);
        }, (error) => {
            if (error.code === 'permission-denied') return; // Ignore on logout
            console.error("Error subscribing to conversations:", error);
        });
    },

    setTypingStatus: async (conversationId: string, userId: string, isTyping: boolean) => {
        try {
            const convRef = doc(db, "directConversations", conversationId);
            await setDoc(convRef, {
                typingIndicator: {
                    [userId]: isTyping ? Date.now() : 0
                }
            }, { merge: true });
        } catch (error) {
            console.error("Failed to update typing indicator:", error);
        }
    },

    updateUserPresence: async (userId: string, isOnline: boolean) => {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            isOnline,
            lastSeen: Date.now()
        }).catch(() => { });
    },

    subscribeToUsersPresence: (userIds: string[], callback: (presenceMap: { [uid: string]: { isOnline: boolean, lastSeen: number } }) => void) => {
        if (!userIds || userIds.length === 0) {
            callback({});
            return () => {};
        }

        const usersRef = collection(db, "users");
        // Firestore 'in' queries are limited to 10 items.
        const chunk = userIds.slice(0, 10);
        const q = query(usersRef, where(documentId(), "in", chunk));

        return onSnapshot(q, (snapshot) => {
            const map: any = {};
            snapshot.docs.forEach(document => {
                const data = document.data();
                map[document.id] = {
                    isOnline: data.isOnline || false,
                    lastSeen: data.lastSeen || 0
                };
            });
            callback(map);
        }, (error) => {
            if (error.code === 'permission-denied') return; // Ignore on logout
            console.error("Error subscribing to user presence:", error);
        });
    }
};
