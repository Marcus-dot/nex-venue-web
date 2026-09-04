"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { eventService } from "@/services/events";
import { Event } from "@/types/events";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import {
    Plus,
    Users,
    Calendar,
    MapPin,
    TrendingUp,
    BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

// Deterministic warm gradient per event (fallback when there's no cover image).
const EVENT_GRADIENTS = [
    ["#e85c29", "#f59e0b"], ["#d97706", "#fbbf24"], ["#c2410c", "#ea580c"],
    ["#f59e0b", "#fcd34d"], ["#9a3412", "#c2410c"], ["#b45309", "#f59e0b"],
];
function eventGradient(title: string): string {
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    const [from, to] = EVENT_GRADIENTS[Math.abs(hash) % EVENT_GRADIENTS.length];
    return `linear-gradient(135deg, ${from}, ${to})`;
}
function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function DashboardPage() {
    const { user, profile, isAdmin, loading: authLoading } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push("/login?redirect=/dashboard");
            } else if (!isAdmin && profile?.role) {
                // User is loaded but not an admin
                router.push("/events");
            }
        }
    }, [user, profile, isAdmin, authLoading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchMyEvents = async () => {
            const data = await eventService.getEventsByCreator(user.uid);
            setEvents(data);
            setLoading(false);
        };

        fetchMyEvents();
    }, [user]);

    if (authLoading || loading) {
        return <LoadingSkeleton stats={3} cards={3} />;
    }

    const totalAttendees = events.reduce((acc, curr) => acc + (curr.attendees?.length || 0), 0);
    const distinctLocations = new Set(events.map((e) => e.location).filter(Boolean)).size;
    const avgPerEvent = events.length ? Math.round(totalAttendees / events.length) : 0;

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] pt-24 pb-20 px-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <h1 className="text-5xl font-black text-surface-dark dark:text-white tracking-tighter mb-4">Organiser Portal</h1>
                        <p className="text-surface-dark/60 dark:text-white/60 text-lg font-medium">Manage your events, agenda, and attendees in one place.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/analytics">
                            <Button variant="outline" size="lg" className="h-14 px-6 text-lg gap-2">
                                <BarChart3 size={22} /> Analytics
                            </Button>
                        </Link>
                        <Link href="/events/create">
                            <Button size="lg" className="h-14 px-8 text-lg shadow-lg shadow-accent/20">
                                <Plus className="mr-2" size={24} /> Create Event
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <GlassCard className="p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                <Calendar size={24} />
                            </div>
                            <div className="text-[10px] font-semibold text-surface-dark/50 dark:text-white/35 uppercase tracking-wider">Events Hosted</div>
                        </div>
                        <div className="text-4xl font-bold text-surface-dark dark:text-white">{events.length}</div>
                        <div className="text-xs font-bold text-surface-dark/55 dark:text-white/40 mt-1">
                            {distinctLocations > 0
                                ? `Across ${distinctLocations} location${distinctLocations === 1 ? "" : "s"}`
                                : "No events yet"}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Users size={24} />
                            </div>
                            <div className="text-[10px] font-semibold text-surface-dark/50 dark:text-white/35 uppercase tracking-wider">Total Reach</div>
                        </div>
                        <div className="text-4xl font-bold text-surface-dark dark:text-white">{totalAttendees}</div>
                        <div className="text-xs font-bold text-surface-dark/55 dark:text-white/40 mt-1">Attendees across your events</div>
                    </GlassCard>

                    <GlassCard className="p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                                <TrendingUp size={24} />
                            </div>
                            <div className="text-[10px] font-semibold text-surface-dark/50 dark:text-white/35 uppercase tracking-wider">Avg. Turnout</div>
                        </div>
                        <div className="text-4xl font-bold text-surface-dark dark:text-white">{avgPerEvent}</div>
                        <div className="text-xs font-bold text-surface-dark/55 dark:text-white/40 mt-1">Attendees per event</div>
                    </GlassCard>
                </div>

                {/* My Events Table/List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-2xl font-bold text-surface-dark dark:text-white">Your Events</h3>
                        {events.length > 0 && (
                            <Link href="/analytics">
                                <Button variant="ghost" size="sm" className="font-bold text-accent">View analytics</Button>
                            </Link>
                        )}
                    </div>

                    {events.length === 0 ? (
                        <GlassCard className="py-20 text-center">
                            <div className="text-surface-dark/20 dark:text-white/20 mb-6">
                                <Calendar size={64} className="mx-auto" />
                            </div>
                            <h4 className="text-xl font-bold text-surface-dark dark:text-white mb-2">No events created yet</h4>
                            <p className="text-surface-dark/60 dark:text-white/60 mb-8 max-w-xs mx-auto">Create your first event to start managing an agenda, attendees, and live Q&amp;A.</p>
                            <Link href="/events/create">
                                <Button className="gap-2"><Plus size={18} strokeWidth={3} /> Create Event</Button>
                            </Link>
                        </GlassCard>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {events.map((event) => (
                                <GlassCard key={event.id} className="p-0 overflow-hidden flex flex-col group">
                                    {/* Cover */}
                                    <div className="relative h-44 w-full overflow-hidden">
                                        {event.imageUrl ? (
                                            <img
                                                src={event.imageUrl}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/25" style={{ background: eventGradient(event.title) }}>
                                                <Calendar size={40} />
                                            </div>
                                        )}
                                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#171a2e]/85 backdrop-blur-sm text-[11px] font-semibold text-surface-dark dark:text-white">
                                            {formatDate(event.date)}
                                        </span>
                                    </div>

                                    {/* Body */}
                                    <div className="flex flex-col flex-grow p-5 gap-3">
                                        <h4 className="text-lg font-bold text-surface-dark dark:text-white line-clamp-1 group-hover:text-accent transition-colors">
                                            {event.title}
                                        </h4>
                                        <div className="flex items-center gap-4 text-sm font-bold text-surface-dark/55 dark:text-white/40">
                                            <span className="flex items-center gap-1.5 shrink-0"><Users size={14} /> {event.attendees?.length || 0} joined</span>
                                            {event.location && (
                                                <span className="flex items-center gap-1.5 min-w-0"><MapPin size={14} className="shrink-0" /> <span className="truncate">{event.location}</span></span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto pt-2">
                                            <Link href={`/events/${event.id}/manage`} className="flex-1">
                                                <Button size="sm" className="w-full font-bold">Manage</Button>
                                            </Link>
                                            <Link href={`/chat?id=${event.id}&type=event&name=${encodeURIComponent(event.title)}`}>
                                                <Button variant="ghost" size="sm" className="font-bold">Chat</Button>
                                            </Link>
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
