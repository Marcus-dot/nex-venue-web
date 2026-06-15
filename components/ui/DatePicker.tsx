"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "./GlassCard";

interface DatePickerProps {
    value: string; // "YYYY-MM-DD"
    onChange: (date: string) => void;
    label?: string;
    className?: string;
}

export const DatePicker = ({ value, onChange, label, className }: DatePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const containerRef = useRef<HTMLDivElement>(null);

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

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const handlePrevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1));
    const handleNextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1));

    const handleDateSelect = (day: number) => {
        const selected = new Date(currentYear, currentMonth, day);
        const formatted = selected.toISOString().split("T")[0];
        onChange(formatted);
        setIsOpen(false);
    };

    const days = [];
    const totalDays = daysInMonth(currentYear, currentMonth);
    const startDay = firstDayOfMonth(currentYear, currentMonth);

    // Padding for first week
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`pad-${i}`} className="h-10 w-10" />);
    }

    // Days of month
    for (let d = 1; d <= totalDays; d++) {
        const isSelected = value === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, d).toDateString();

        days.push(
            <button
                key={d}
                type="button"
                onClick={() => handleDateSelect(d)}
                className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                    isSelected ? "bg-accent text-white shadow-lg shadow-accent/20" : 
                    isToday ? "bg-accent/10 text-accent" : 
                    "hover:bg-surface-dark/5 dark:hover:bg-white/5 text-surface-dark/70 dark:text-white/70"
                )}
            >
                {d}
            </button>
        );
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            {label && <label className="text-sm font-bold text-surface-dark dark:text-white ml-1 mb-2 block">{label}</label>}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl flex items-center justify-between hover:border-accent/40 transition-all group"
            >
                <span className={cn("font-medium", value ? "text-surface-dark dark:text-white" : "text-surface-dark/30 dark:text-white/30")}>
                    {value ? new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Select date"}
                </span>
                <CalendarIcon size={20} className="text-surface-dark/30 dark:text-white/30 group-hover:text-accent transition-colors" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-50 mt-2 w-full min-w-[320px] left-0 md:left-auto md:right-0"
                    >
                        <GlassCard className="!p-6 shadow-2xl border-white/40">
                            <div className="flex items-center justify-between mb-6">
                                <button type="button" onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-surface-dark/5 dark:hover:bg-white/5 text-surface-dark/40 dark:text-white/40">
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="text-lg font-black text-surface-dark dark:text-white">
                                    {monthNames[currentMonth]} {currentYear}
                                </div>
                                <button type="button" onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-surface-dark/5 dark:hover:bg-white/5 text-surface-dark/40 dark:text-white/40">
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                    <div key={day} className="h-10 w-10 flex items-center justify-center text-[10px] font-black uppercase text-surface-dark/20 dark:text-white/20 tracking-wider">
                                        {day}
                                    </div>
                                ))}
                                {days}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
