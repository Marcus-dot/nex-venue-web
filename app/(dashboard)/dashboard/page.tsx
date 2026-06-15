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
    ChevronRight,
    TrendingUp,
    Loader2,
    Settings,
    MoreVertical
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }

    const totalAttendees = events.reduce((acc, curr) => acc + (curr.attendees?.length || 0), 0);

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] pt-24 pb-20 px-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <h1 className="text-5xl font-black text-surface-dark dark:text-white tracking-tighter mb-4">Organizer Portal</h1>
                        <p className="text-surface-dark/60 dark:text-white/60 text-lg font-medium">Simplify your event management experience.</p>
                    </div>

                    <Link href="/events/create">
                        <Button size="lg" className="h-14 px-8 text-lg font-black shadow-lg shadow-accent/20">
                            <Plus className="mr-2" size={24} /> Create Event
                        </Button>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <GlassCard className="!p-8 border-l-8 border-l-accent">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                <Calendar size={24} />
                            </div>
                            <div className="text-[10px] font-black text-surface-dark/30 dark:text-white/30 uppercase tracking-widest">Active Events</div>
                        </div>
                        <div className="text-4xl font-black text-surface-dark dark:text-white">{events.length}</div>
                        <div className="text-xs font-bold text-surface-dark/40 dark:text-white/40 mt-1">Hosting across 4 locations</div>
                    </GlassCard>

                    <GlassCard className="!p-8 border-l-8 border-l-blue-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Users size={24} />
                            </div>
                            <div className="text-[10px] font-black text-surface-dark/30 dark:text-white/30 uppercase tracking-widest">Total Reach</div>
                        </div>
                        <div className="text-4xl font-black text-surface-dark dark:text-white">{totalAttendees}</div>
                        <div className="text-xs font-bold text-surface-dark/40 dark:text-white/40 mt-1">Attendees registered globally</div>
                    </GlassCard>

                    <GlassCard className="!p-8 border-l-8 border-l-green-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                                <TrendingUp size={24} />
                            </div>
                            <div className="text-[10px] font-black text-surface-dark/30 dark:text-white/30 uppercase tracking-widest">Engagement</div>
                        </div>
                        <div className="text-4xl font-black text-surface-dark dark:text-white">92%</div>
                        <div className="text-xs font-bold text-surface-dark/40 dark:text-white/40 mt-1">Avg. attendance rate</div>
                    </GlassCard>
                </div>

                {/* My Events Table/List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-2xl font-black text-surface-dark dark:text-white">Recent Events</h3>
                        <Button variant="ghost" size="sm" className="font-bold text-accent">View All Archives</Button>
                    </div>

                    <div className="space-y-4">
                        {events.length === 0 ? (
                            <GlassCard className="py-20 text-center">
                                <div className="text-surface-dark/20 dark:text-white/20 mb-6">
                                    <Calendar size={64} className="mx-auto" />
                                </div>
                                <h4 className="text-xl font-black text-surface-dark dark:text-white mb-2">No events created yet</h4>
                                <p className="text-surface-dark/60 dark:text-white/60 mb-8 max-w-xs mx-auto">Click "Create Event" to launch your first experience on NexVenue.</p>
                            </GlassCard>
                        ) : (
                            events.map((event) => (
                                <GlassCard key={event.id} className="!p-0 overflow-hidden group hover:border-accent/30 transition-all">
                                    <div className="flex flex-col md:flex-row items-stretch">
                                        <div className="w-full md:w-32 h-32 bg-surface-dark/5 dark:bg-white/5 flex-shrink-0">
                                            {event.imageUrl ? (
                                                <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-surface-dark/20 bg-premium-gradient opacity-20">
                                                    <Calendar size={32} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <h4 className="text-xl font-black text-surface-dark dark:text-white group-hover:text-accent transition-colors">{event.title}</h4>
                                                <div className="flex items-center gap-4 text-sm font-bold text-surface-dark/40 dark:text-white/40">
                                                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {event.date}</span>
                                                    <span className="flex items-center gap-1.5"><Users size={14} /> {event.attendees?.length || 0} Joined</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Link href={`/events/${event.id}`}>
                                                    <Button variant="secondary" size="sm" className="font-bold">Edit Event</Button>
                                                </Link>
                                                <Link href={`/chat?id=${event.id}&type=event&name=${encodeURIComponent(event.title)}`}>
                                                    <Button variant="ghost" size="sm" className="font-bold">Open Chat</Button>
                                                </Link>
                                                <button className="p-2 hover:bg-surface-dark/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                                                    <Settings size={20} className="text-surface-dark/40 dark:text-white/40" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
