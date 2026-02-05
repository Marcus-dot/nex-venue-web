export interface ChatMessage {
    id: string;
    eventId?: string; // Optional for direct messages
    conversationId: string; // For both group and direct chats
    senderId: string;
    senderName: string;
    senderPhone: string;
    message: string;
    timestamp: number;
    type: 'text' | 'system';
    edited?: boolean;
    editedAt?: number;
}

export interface ChatRoom {
    id: string; // This will be the eventId
    eventId: string;
    eventTitle: string;
    participants: string[]; // Array of user IDs
    lastMessage?: string;
    lastMessageTimestamp?: number;
    lastActivity: number;
    isActive: boolean;
}

export interface DirectConversation {
    id: string; // Generated from participant IDs
    participants: string[]; // Array of 2 user IDs
    participantDetails: {
        [userId: string]: {
            name: string;
            phone: string;
        }
    };
    lastMessage?: string;
    lastMessageTimestamp: number;
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface ChatParticipant {
    uid: string;
    name: string;
    phone: string;
    isOnline: boolean;
    lastSeen: number;
    isTyping?: boolean;
}
