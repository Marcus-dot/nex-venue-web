export type User = {
    uid: string;
    phoneNumber: string | null;
};

export type UserRole = 'admin' | 'user';

export type UserProfile = {
    // --- Core identity ---
    uid: string | undefined;
    phoneNumber: string;
    fullName?: string;
    avatar: string | null;
    coverImage?: string | null;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';

    // --- Professional info ---
    email?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
    bio?: string; // max 160 chars

    // --- Event preferences ---
    eventInterests?: string[];
    dietaryRestrictions?: 'none' | 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten_free' | 'other';
    tshirtSize?: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
    networkingAvailability?: 'open' | 'selective' | 'not_available';

    // --- Social links ---
    linkedinUrl?: string;
    twitterHandle?: string; // without @
    websiteUrl?: string;

    // --- System fields ---
    role: UserRole;
    createdAt: number;
    profileComplete?: boolean;
    isOnline?: boolean;
    lastSeen?: number;

    // --- App preferences ---
    settings?: {
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        smsNotifications?: boolean;
        darkMode?: boolean;
        privateProfile?: boolean;
    };
};

export const INDUSTRY_OPTIONS = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'Marketing',
    'Legal', 'Media & Entertainment', 'Retail', 'Manufacturing',
    'Real Estate', 'Non-Profit', 'Government', 'Other',
];

export const EVENT_INTEREST_OPTIONS = [
    'Networking', 'Tech & Innovation', 'Business & Entrepreneurship',
    'Music & Arts', 'Sports & Fitness', 'Food & Beverage',
    'Education & Learning', 'Health & Wellness', 'Fashion',
    'Finance & Investing', 'Gaming', 'Social Impact',
];
