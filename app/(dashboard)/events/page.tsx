"use client";

import { useEffect, useState } from "react";
import { eventService } from "@/services/events";
import { Event } from "@/types/events";
import { EventCard } from "@/components/features/EventCard";
import { Button } from "@/components/ui/Button";
import { Search, SlidersHorizontal, Loader2, Calendar } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchEvents = async () => {
            const data = await eventService.getAllEvents();
            setEvents(data);
            setLoading(false);
        };
        fetchEvents();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-surface-dark/5 px-8 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold">N</div>
                        <span className="text-xl font-bold tracking-tight text-surface-dark">NexVenue</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <Link href="/profile">
                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold border border-accent/20">
                                    {user.email?.[0].toUpperCase()}
                                </div>
                            </Link>
                        ) : (
                            <Link href="/login">
                                <Button size="sm" variant="ghost">Login</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div>
                        <h1 className="text-5xl font-black text-surface-dark mb-4">Discover Events</h1>
                        <p className="text-surface-dark/60 text-lg">Explore what's happening in your community</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative flex-grow">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-dark/30" size={20} />
                            <Input className="pl-12 !py-3" placeholder="Search events..." />
                        </div>
                        <Button variant="secondary" className="flex items-center gap-2 !py-3">
                            <SlidersHorizontal size={18} /> Filters
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-accent">
                        <Loader2 className="animate-spin mb-4" size={48} />
                        <span className="font-bold text-lg">Loading amazing events...</span>
                    </div>
                ) : events.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {events.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white/50 rounded-3xl border-2 border-dashed border-surface-dark/10">
                        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto mb-6">
                            <Calendar size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-surface-dark mb-2">No events found</h3>
                        <p className="text-surface-dark/60 mb-8 max-w-sm mx-auto">
                            We couldn't find any events at the moment. Check back later or try a different search.
                        </p>
                        <Button onClick={() => window.location.reload()}>Refresh Feed</Button>
                    </div>
                )}
            </main>
        </div>
    );
}
