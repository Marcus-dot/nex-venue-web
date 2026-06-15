"use client";

import { cn } from "@/lib/utils/cn";

interface AvatarDisplayProps {
    avatarUrl: string | null;
    fullName?: string;
    size?: number;
    className?: string;
}

// Deterministic color from name — same name always gets the same color
function getAvatarColor(name: string): string {
    const colors = [
        "#e85c29", // accent
        "#3b82f6", // blue
        "#10b981", // green
        "#8b5cf6", // purple
        "#f59e0b", // amber
        "#ec4899", // pink
        "#06b6d4", // cyan
        "#6366f1", // indigo
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function getInitials(name?: string): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AvatarDisplay = ({
    avatarUrl,
    fullName,
    size = 48,
    className,
}: AvatarDisplayProps) => {
    const initials = getInitials(fullName);
    const bgColor = getAvatarColor(fullName || "?");

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={fullName || "Profile picture"}
                width={size}
                height={size}
                className={cn("rounded-full object-cover shrink-0", className)}
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <div
            className={cn("rounded-full flex items-center justify-center shrink-0 text-white font-black select-none", className)}
            style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.36 }}
        >
            {initials}
        </div>
    );
};
