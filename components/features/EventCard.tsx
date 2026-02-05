"use client";

import React, { useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Event } from "@/types/events";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";

interface EventCardProps {
    event: Event;
}

export const EventCard = ({ event }: EventCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        const handleMouseEnter = () => {
            gsap.to(card, {
                y: -10,
                duration: 0.3,
                ease: "power2.out",
                boxShadow: "0 20px 40px rgba(232, 92, 41, 0.1)"
            });
        };

        const handleMouseLeave = () => {
            gsap.to(card, {
                y: 0,
                duration: 0.3,
                ease: "power2.out",
                boxShadow: "none"
            });
        };

        card.addEventListener("mouseenter", handleMouseEnter);
        card.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            card.removeEventListener("mouseenter", handleMouseEnter);
            card.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <div ref={cardRef}>
            <GlassCard className="group overflow-hidden flex flex-col h-full !p-0">
                <div className="relative h-48 w-full overflow-hidden">
                    {event.imageUrl ? (
                        <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-premium-gradient flex items-center justify-center text-white/20">
                            <Calendar size={64} />
                        </div>
                    )}
                    <div className="absolute top-4 left-4">
                        <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-accent shadow-sm">
                            {event.date}
                        </div>
                    </div>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-black text-surface-dark mb-2 line-clamp-1 group-hover:text-accent transition-colors">{event.title}</h3>
                    <p className="text-surface-dark/60 text-sm mb-6 line-clamp-2 h-10 font-medium">
                        {event.description}
                    </p>

                    <div className="space-y-3 mt-auto">
                        <div className="flex items-center gap-2 text-surface-dark/70 text-sm font-bold">
                            <MapPin size={16} className="text-accent" />
                            <span className="line-clamp-1">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-surface-dark/70 text-sm font-bold">
                            <Users size={16} className="text-accent" />
                            <span>{event.attendees?.length || 0} attending</span>
                        </div>
                    </div>

                    <Link href={`/events/${event.id}`} className="mt-6">
                        <button className="w-full py-4 rounded-xl border-2 border-accent/20 text-accent font-black text-xs uppercase tracking-widest hover:bg-accent hover:border-accent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-sm">
                            View Details <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </Link>
                </div>
            </GlassCard>
        </div>
    );
};
