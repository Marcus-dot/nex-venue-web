"use client";

import React, { useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Event } from "@/types/events";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";

// Deterministic gradient from event title — every event gets a unique persistent identity
const EVENT_GRADIENTS = [
    ["#e85c29", "#f59e0b"],
    ["#6366f1", "#8b5cf6"],
    ["#10b981", "#06b6d4"],
    ["#ec4899", "#f43f5e"],
    ["#3b82f6", "#6366f1"],
    ["#f59e0b", "#ef4444"],
    ["#8b5cf6", "#ec4899"],
    ["#06b6d4", "#3b82f6"],
];

function getEventColors(title: string): { gradient: string; accent: string } {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const [from, to] = EVENT_GRADIENTS[Math.abs(hash) % EVENT_GRADIENTS.length];
    return {
        gradient: `linear-gradient(135deg, ${from}, ${to})`,
        accent: from,
    };
}

interface EventCardProps {
    event: Event;
}

export const EventCard = ({ event }: EventCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const { gradient, accent } = getEventColors(event.title);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        const handleMouseEnter = () => {
            gsap.to(card, {
                y: -8,
                duration: 0.3,
                ease: "power2.out",
                boxShadow: `0 24px 48px ${accent}30`,
            });
        };

        const handleMouseLeave = () => {
            gsap.to(card, {
                y: 0,
                duration: 0.3,
                ease: "power2.out",
                boxShadow: "none",
            });
        };

        card.addEventListener("mouseenter", handleMouseEnter);
        card.addEventListener("mouseleave", handleMouseLeave);
        return () => {
            card.removeEventListener("mouseenter", handleMouseEnter);
            card.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [accent]);

    return (
        <div ref={cardRef}>
            <GlassCard className="group overflow-hidden flex flex-col h-full !p-0">
                {/* Colored accent strip — unique per event */}
                <div className="h-1 w-full" style={{ background: gradient }} />

                <div className="relative h-48 w-full overflow-hidden">
                    {event.imageUrl ? (
                        <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: gradient }}
                        >
                            <Calendar size={56} className="text-white/20" />
                        </div>
                    )}
                    {/* Date badge */}
                    <div className="absolute top-4 left-4">
                        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold shadow-sm" style={{ color: accent }}>
                            {event.date}
                        </div>
                    </div>
                    {/* Attendee count overlay */}
                    <div className="absolute top-4 right-4">
                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold text-white">
                            <Users size={11} /> {event.attendees?.length || 0}
                        </div>
                    </div>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-black text-surface-dark dark:text-white mb-2 line-clamp-1 transition-colors" style={{ ["--accent-color" as any]: accent }}>
                        {event.title}
                    </h3>
                    <p className="text-surface-dark/60 dark:text-white/60 text-sm mb-6 line-clamp-2 h-10 font-medium">
                        {event.description}
                    </p>

                    <div className="space-y-2.5 mt-auto">
                        <div className="flex items-center gap-2 text-surface-dark/70 dark:text-white/70 text-sm font-bold">
                            <MapPin size={14} style={{ color: accent }} />
                            <span className="line-clamp-1">{event.location}</span>
                        </div>
                    </div>

                    <Link href={`/events/${event.id}`} className="mt-5">
                        <button
                            className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border-2 hover:text-white"
                            style={{
                                borderColor: `${accent}40`,
                                color: accent,
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = gradient;
                                (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                                (e.currentTarget as HTMLButtonElement).style.color = "white";
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}40`;
                                (e.currentTarget as HTMLButtonElement).style.color = accent;
                            }}
                        >
                            View Details <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </Link>
                </div>
            </GlassCard>
        </div>
    );
};
