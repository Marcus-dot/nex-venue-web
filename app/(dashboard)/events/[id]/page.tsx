"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { eventService } from "@/services/events";
import { agendaService } from "@/services/agenda";
import { Event } from "@/types/events";
import { AgendaItem } from "@/types/agenda";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { AgendaList } from "@/components/features/AgendaList";
import {
    Calendar,
    MapPin,
    Users,
    ArrowLeft,
    Share2,
    Bookmark,
    Loader2,
    Clock,
    Info
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import gsap from "gsap";
import { useRef } from "react";

export default function EventDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            const eventData = await eventService.getEventById(id as string);
            if (eventData) {
                setEvent(eventData);
                // Subscribe to real-time agenda
                const unsubscribe = agendaService.subscribeToAgenda(id as string, (data) => {
                    setAgenda(data);
                });
                setLoading(false);

                // Trigger animations after data is loaded
                setTimeout(() => {
                    gsap.context(() => {
                        gsap.from(".animate-up", {
                            y: 40,
                            opacity: 0,
                            duration: 0.8,
                            stagger: 0.1,
                            ease: "power4.out"
                        });
                    }, containerRef);
                }, 100);

                return () => unsubscribe();
            } else {
                router.push("/events");
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }
    if (!event) return null;

    return (
        <div ref={containerRef} className="min-h-screen bg-background pb-20">
            {/* Dynamic Background */}
            <div className="fixed top-0 left-0 w-full h-[60vh] -z-10 bg-premium-gradient overflow-hidden">
                {event.imageUrl && (
                    <div className="absolute inset-0">
                        <img
                            src={event.imageUrl}
                            alt=""
                            className="w-full h-full object-cover opacity-40 blur-sm"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-premium-gradient/80 via-premium-gradient to-background" />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between relative z-10">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg"
                >
                    <ArrowLeft size={24} />
                </button>

                <div className="flex gap-4">
                    <button className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg">
                        <Share2 size={24} />
                    </button>
                    <button className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg">
                        <Bookmark size={24} />
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-8 py-4 grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
                {/* Left Column: Info & Details */}
                <div className="lg:col-span-2 space-y-12 animate-up">
                    {/* Hero Content */}
                    <div>
                        <div className="flex items-center gap-3 text-white/70 font-bold mb-4">
                            <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent text-sm">
                                Upcoming Event
                            </span>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-sm backdrop-blur-sm">
                                <Calendar size={16} /> {event.date}
                            </div>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tighter">
                            {event.title}
                        </h1>

                        <div className="flex flex-wrap gap-8 text-white/80">
                            <div className="flex items-center gap-2">
                                <Clock size={20} className="text-accent" />
                                <span className="font-bold text-lg">{event.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin size={20} className="text-accent" />
                                <span className="font-bold text-lg">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={20} className="text-accent" />
                                <span className="font-bold text-lg">{event.attendees?.length || 0} Attending</span>
                            </div>
                        </div>
                    </div>

                    {/* Description Section */}
                    <GlassCard className="!p-8">
                        <h3 className="text-2xl font-black text-surface-dark mb-6 flex items-center gap-2">
                            <Info size={24} className="text-accent" /> About this event
                        </h3>
                        <div className="prose prose-lg text-surface-dark/70 leading-relaxed font-medium">
                            {event.description}
                        </div>
                    </GlassCard>

                    {/* Agenda Section */}
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-3xl font-black text-surface-dark">Event Schedule</h3>
                            <div className="flex items-center gap-2 text-surface-dark/40 text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-green-500" /> Live Updates Enabled
                            </div>
                        </div>
                        <AgendaList items={agenda} currentId={event.currentAgendaItem} />
                    </div>
                </div>

                {/* Right Column: CTA & Organizers */}
                <div className="space-y-8 animate-up">
                    <GlassCard className="sticky top-28 !p-8 border-2 border-accent/20">
                        <div className="mb-6">
                            <div className="text-sm font-bold text-surface-dark/40 uppercase tracking-widest mb-1">Status</div>
                            <div className="text-3xl font-black text-surface-dark">Registration Open</div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <Button className="w-full text-lg !py-5">Keep Me Updated</Button>
                            <Button variant="outline" className="w-full text-lg !py-5">Join Discussion</Button>
                        </div>

                        <div className="pt-8 border-t border-surface-dark/10">
                            <h4 className="font-black text-surface-dark mb-4">Organized by</h4>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black">
                                    {event.creatorName?.[0]}
                                </div>
                                <div>
                                    <div className="font-black text-surface-dark">{event.creatorName}</div>
                                    <div className="text-xs text-surface-dark/40 font-bold uppercase">Event Host</div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="!p-8">
                        <h4 className="font-black text-surface-dark mb-6">Attendees</h4>
                        <div className="flex items-center -space-x-3 mb-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full bg-surface-dark/10 border-2 border-white flex items-center justify-center text-[10px] font-black">
                                    A{i}
                                </div>
                            ))}
                            <div className="w-10 h-10 rounded-full bg-accent text-white border-2 border-white flex items-center justify-center text-[10px] font-black">
                                +{Math.max(0, (event.attendees?.length || 0) - 5)}
                            </div>
                        </div>
                        <p className="text-sm text-surface-dark/60 font-medium">
                            Join {event.attendees?.length || 0} others at this event.
                        </p>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
}
