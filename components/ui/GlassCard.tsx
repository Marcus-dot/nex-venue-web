import React from "react";
import { cn } from "@/lib/utils/cn";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const GlassCard = ({ children, className, onClick }: GlassCardProps) => {
    return (
        <div
            onClick={onClick}
            className={cn(
                "glass-card p-6 rounded-3xl transition-all duration-300",
                onClick && "cursor-pointer hover:scale-[1.02] active:scale-95",
                className
            )}
        >
            {children}
        </div>
    );
};
