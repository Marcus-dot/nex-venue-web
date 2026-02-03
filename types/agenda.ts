export interface AgendaItem {
    id: string;
    eventId: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    date: string;
    speaker?: string;
    location?: string;
    category?: 'presentation' | 'break' | 'networking' | 'workshop' | 'panel' | 'keynote' | 'remarks' | 'demo' | 'case_study' | 'fireside' | 'other';
    isBreak?: boolean;
    order: number;
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    lastEditedBy: string;
    speakerBio?: string;
    speakerImage?: string;
    speakerImages?: string[];

    // NEW FIELDS FOR SIMULTANEOUS EVENTS
    simultaneousGroupId?: string; // Groups simultaneous events (e.g., "side-events-oct3-1545")
    attendeeSelections?: string[]; // Array of user IDs who selected this event
    maxAttendees?: number; // Optional capacity limit
}

export interface EventAgenda {
    eventId: string;
    items: AgendaItem[];
    lastUpdated: number;
    isLive: boolean; // whether agenda is currently being presented
    currentItem?: string; // current agenda item ID if live
}
