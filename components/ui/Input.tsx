import React from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input = ({ className, ...props }: InputProps) => {
    return (
        <input
            className={cn(
                "w-full px-5 py-4 bg-white/50 border border-surface-dark/10 rounded-xl",
                "focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent",
                "transition-all duration-200 placeholder:text-surface-dark/30 text-surface-dark font-medium",
                className
            )}
            {...props}
        />
    );
};
