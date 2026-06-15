export type NotificationType = 'event_invite' | 'event_update' | 'chat_message' | 'system_alert';

export interface AppNotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    read: boolean;
    createdAt: number;
    link?: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
}
