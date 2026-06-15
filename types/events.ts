export interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    creatorId: string;
    creatorName: string;
    attendees: string[];
    createdAt: number;
    currentAgendaItem?: string; // For live agenda tracking
    agendaLastUpdated?: number; // When the agenda was last updated
    imageUrl?: string; // Optional event image
    imageDescription?: string; // Alt text for accessibility

    // Role-based Access Control (RBAC) Arrays
    organisers: string[];   // User IDs with management access
    speakers: string[];     // User IDs of speakers
    exhibitors: string[];   // User IDs of exhibitors
}

export type EventRole = 'organiser' | 'speaker' | 'exhibitor';

export interface EventParticipant {
    id: string;             // userId
    eventId: string;
    role: EventRole;
    displayName: string;
    bio?: string;           // For Speakers
    boothDetails?: string;  // For Exhibitors
    company?: string;
    photoUrl?: string;
    timestamp: number;
}

export interface RoleRequest {
    id: string;
    eventId: string;
    userId: string;
    userName: string;
    userEmail?: string;
    userPhone?: string;
    requestedRole: EventRole;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: number;
}
