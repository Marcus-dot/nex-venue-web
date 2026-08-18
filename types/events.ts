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
    maxAttendees?: number; // optional capacity cap; undefined/0 = unlimited
    isOpen?: boolean; // true/undefined = anyone can attend; false = requires organiser approval
    createdAt: number;
    currentAgendaItem?: string; // For live agenda tracking
    agendaLastUpdated?: number; // When the agenda was last updated
    imageUrl?: string; // Optional event image
    imageDescription?: string; // Alt text for accessibility

    // Role-based Access Control (RBAC) Arrays
    organisers: string[];   // User IDs with management access
    speakers: string[];     // User IDs of speakers
    exhibitors: string[];   // User IDs of exhibitors

    // Curated speaker cards for people who don't (yet) have an app account.
    // Rendered in the Speakers section alongside account-based `speakers[]`.
    speakerProfiles?: SpeakerProfile[];
}

// A display-only speaker card. `linkedUserId` optionally bridges the card to a
// real account once that speaker signs up — see dedupe/merge in the Speakers UI.
export interface SpeakerProfile {
    id: string;                    // stable id for keying/editing/reordering
    name: string;
    title?: string;                // job title, e.g. "CEO, ZECHL"
    company?: string;
    bio?: string;
    photoUrl?: string;             // Firebase Storage URL
    order?: number;                // display order (ascending)
    linkedUserId?: string | null;  // links this card to a real user account
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

// Mirrors the mobile `attendanceRequests` collection schema exactly (shared Firestore).
export interface AttendanceRequest {
    id: string;
    eventId: string;
    userId: string;
    userName: string;
    userPhone?: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: number;
}
