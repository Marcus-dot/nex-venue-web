export type User = {
    uid: string;
    phoneNumber: string | null;
};

export type UserRole = 'admin' | 'user';

export type UserProfile = {
    uid: string | undefined;
    phoneNumber: string;
    fullName?: string;
    email?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    role: UserRole;
    createdAt: number;
    profileComplete?: boolean;
    avatar: string | null;
    // Presence fields for chat...
    isOnline?: boolean;
    lastSeen?: number;
}
