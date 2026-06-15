"use client";

import React, { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "./GlassCard";

interface TimePickerProps {
    value: string; // "HH:MM AM/PM" or similar
    onChange: (time: string) => void;
    label?: string;
    className?: string;
}

export const TimePicker = ({ value, onChange, label, className }: TimePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial parsing
    const parseValue = (val: string) => {
        const parts = val.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (parts) {
            return { hour: parts[1], minute: parts[2], period: parts[3].toUpperCase() };
        }
        return { hour: "10", minute: "00", period: "AM" };
    };

    const { hour, minute, period } = parseValue(value || "10:00 AM");

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (h: string, m: string, p: string) => {
        onChange(`${h}:${m} ${p}`);
        // Not automatically closing so user can adjust multiple fields easily
    };

    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            {label && <label className="text-sm font-bold text-surface-dark dark:text-white ml-1 mb-2 block">{label}</label>}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl flex items-center justify-between hover:border-accent/40 transition-all group"
            >
                <span className={cn("font-medium", value ? "text-surface-dark dark:text-white" : "text-surface-dark/30 dark:text-white/30")}>
                    {value || "Select time"}
                </span>
                <Clock size={20} className="text-surface-dark/30 dark:text-white/30 group-hover:text-accent transition-colors" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-50 mt-2 w-full min-w-[280px] right-0"
                    >
                        <GlassCard className="!p-4 shadow-2xl border-white/40">
                            <div className="grid grid-cols-3 gap-2 h-48">
                                {/* Hour Column */}
                                <div className="overflow-y-auto pr-1 scrollbar-hide overscroll-contain" data-lenis-prevent>
                                    <div className="text-[10px] font-black uppercase text-surface-dark/20 dark:text-white/20 text-center mb-2">Hour</div>
                                    <div className="space-y-1">
                                        {hours.map(h => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => handleSelect(h, minute, period)}
                                                className={cn(
                                                    "w-full py-2 rounded-lg text-sm font-bold transition-all",
                                                    hour === h ? "bg-accent text-white" : "hover:bg-surface-dark/5 dark:hover:bg-white/5 text-surface-dark/60 dark:text-white/60"
                                                )}
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Minute Column */}
                                <div className="overflow-y-auto pr-1 scrollbar-hide overscroll-contain" data-lenis-prevent>
                                    <div className="text-[10px] font-black uppercase text-surface-dark/20 dark:text-white/20 text-center mb-2">Min</div>
                                    <div className="space-y-1">
                                        {minutes.map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => handleSelect(hour, m, period)}
                                                className={cn(
                                                    "w-full py-2 rounded-lg text-sm font-bold transition-all",
                                                    minute === m ? "bg-accent text-white" : "hover:bg-surface-dark/5 dark:hover:bg-white/5 text-surface-dark/60 dark:text-white/60"
                                                )}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Period Column */}
                                <div className="flex flex-col">
                                    <div className="text-[10px] font-black uppercase text-surface-dark/20 dark:text-white/20 text-center mb-2">Period</div>
                                    <div className="space-y-1 flex-grow flex flex-col justify-center">
                                        {['AM', 'PM'].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => handleSelect(hour, minute, p)}
                                                className={cn(
                                                    "w-full py-4 rounded-lg text-sm font-black transition-all",
                                                    period === p ? "bg-accent text-white shadow-lg shadow-accent/20" : "hover:bg-surface-dark/5 dark:hover:bg-white/5 text-surface-dark/30 dark:text-white/30"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="mt-4 py-2 w-full bg-surface-dark text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};
