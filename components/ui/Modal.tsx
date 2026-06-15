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
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                        className="relative w-full max-w-lg z-10"
                    >
                        <GlassCard className="overflow-hidden border-2 border-white/20 dark:border-white/5 shadow-2xl">
                            <div className="p-6 border-b border-surface-dark/5 dark:border-white/5 flex items-center justify-between">
                                <h3 className="text-2xl font-black text-surface-dark dark:text-white tracking-tight">
                                    {title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl hover:bg-surface-dark/5 dark:hover:bg-white/5 text-surface-dark/40 dark:text-white/40 hover:text-surface-dark dark:hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-8">
                                {children}
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
