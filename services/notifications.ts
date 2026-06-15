import { db } from "@/lib/firebase/config";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    writeBatch,
    getDocs,
    deleteDoc,
    addDoc
} from "firebase/firestore";
import { AppNotification } from "@/types/notifications";

export const notificationService = {
    subscribeToNotifications: (userId: string, callback: (notifications: AppNotification[]) => void) => {
        const notificationsRef = collection(db, "notifications");
        const q = query(
            notificationsRef,
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AppNotification[];
            callback(notifications);
        }, (error) => {
            if (error.code === 'permission-denied') return; // Ignore on logout
            console.error("Error subscribing to notifications:", error);
        });
    },

    markAsRead: async (notificationId: string) => {
        try {
            const docRef = doc(db, "notifications", notificationId);
            await updateDoc(docRef, { read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
            throw error;
        }
    },

    markAllAsRead: async (userId: string) => {
        try {
            const notificationsRef = collection(db, "notifications");
            const q = query(
                notificationsRef,
                where("userId", "==", userId),
                where("read", "==", false)
            );
            
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            
            snapshot.docs.forEach((document) => {
                const docRef = doc(db, "notifications", document.id);
                batch.update(docRef, { read: true });
            });
            
            await batch.commit();
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
            throw error;
        }
    },

    deleteNotification: async (notificationId: string) => {
        try {
            const docRef = doc(db, "notifications", notificationId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error deleting notification:", error);
            throw error;
        }
    },

    // Utility block to create simulated notifications for testing easily
    createMockNotification: async (userId: string, title: string, body: string, link: string) => {
        try {
            const notificationsRef = collection(db, "notifications");
            await addDoc(notificationsRef, {
                userId,
                type: 'system_alert',
                title,
                body,
                link,
                read: false,
                createdAt: Date.now()
            });
        } catch (e) {
            console.error("Mock failed", e);
        }
    }
};
