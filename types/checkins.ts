export interface CheckIn {
    id: string; // `${eventId}_${uid}`
    eventId: string;
    uid: string;
    name: string;
    checkedInAt: number;
    checkedInBy: string; // organiser uid who performed the check-in
}
