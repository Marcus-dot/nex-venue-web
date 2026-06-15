import React from "react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
}

export const Button = ({
    className,
    variant = "primary",
    size = "md",
    ...props
}: ButtonProps) => {
    const variants = {
        primary: "bg-accent text-white hover:bg-accent-hover shadow-xl shadow-accent/30 active:scale-95",
        secondary: "bg-surface-dark text-white hover:bg-surface-dark/90 dark:bg-white/10 dark:hover:bg-white/20",
        outline: "border-2 border-accent text-accent hover:bg-accent/5 dark:hover:bg-accent/10",
        ghost: "bg-transparent text-surface-dark/60 hover:bg-surface-dark/5 hover:text-surface-dark hover:scale-[1.02] dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white",
    };

    const sizes = {
        sm: "px-4 py-2 text-sm rounded-lg",
        md: "px-6 py-3 text-base rounded-xl",
        lg: "px-8 py-4 text-lg rounded-2xl",
    };

    return (
        <button
            className={cn(
                "font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-50",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
};
