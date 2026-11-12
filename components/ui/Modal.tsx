"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    /** "default" (max-w-lg) for normal dialogs, "wide" for projector-friendly content, "full" for near edge-to-edge. */
    size?: "default" | "wide" | "full";
    /** Override the body wrapper classes — pass "" / "p-0" for full-bleed layouts. */
    bodyClassName?: string;
}

export const Modal = ({ isOpen, onClose, title, children, size = "default", bodyClassName = "p-8" }: ModalProps) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center ${size === "full" ? "p-3 sm:p-4" : "p-4"}`}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-surface-dark/40 dark:bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={`relative w-full z-10 ${size === "full" ? "max-w-none h-full" : size === "wide" ? "max-w-6xl" : "max-w-lg"}`}
                    >
                        <GlassCard className={`overflow-hidden border-2 border-white/20 dark:border-white/5 shadow-2xl flex flex-col ${size === "full" ? "h-full" : size === "wide" ? "h-[86vh]" : "max-h-[90vh]"}`}>
                            <div className="shrink-0 p-6 border-b border-surface-dark/5 dark:border-white/5 flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-surface-dark dark:text-white tracking-tight">
                                    {title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl hover:bg-surface-dark/5 dark:hover:bg-white/5 text-surface-dark/55 dark:text-white/40 hover:text-surface-dark dark:hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className={`flex-1 min-h-0 ${size === "wide" || size === "full" ? "overflow-y-auto md:overflow-hidden" : "overflow-y-auto"} ${bodyClassName}`}>
                                {children}
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
