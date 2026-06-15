"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "success") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className="pointer-events-auto"
                        >
                            <div className={cn(
                                "flex items-center gap-4 px-6 py-4 rounded-2xl glass-card border border-white/40 shadow-2xl min-w-[300px] max-w-md",
                                toast.type === "success" && "border-green-500/20 bg-green-500/[0.02]",
                                toast.type === "error" && "border-red-500/20 bg-red-500/[0.02]",
                                toast.type === "info" && "border-accent/20 bg-accent/[0.02]"
                            )}>
                                <div className={cn(
                                    "p-2 rounded-xl shrink-0",
                                    toast.type === "success" && "bg-green-500/10 text-green-500",
                                    toast.type === "error" && "bg-red-500/10 text-red-500",
                                    toast.type === "info" && "bg-accent/10 text-accent"
                                )}>
                                    {toast.type === "success" && <CheckCircle2 size={24} />}
                                    {toast.type === "error" && <XCircle size={24} />}
                                    {toast.type === "info" && <Info size={24} />}
                                </div>
                                
                                <div className="flex-grow font-black text-surface-dark text-sm">
                                    {toast.message}
                                </div>

                                <button 
                                    onClick={() => removeToast(toast.id)}
                                    className="p-1 hover:bg-surface-dark/5 rounded-lg text-surface-dark/20 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
};
