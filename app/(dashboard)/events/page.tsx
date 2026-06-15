"use client";

import { useEffect, useState, useMemo } from "react";
import { eventService } from "@/services/events";
import { Event } from "@/types/events";
import { EventCard } from "@/components/features/EventCard";
import { Search, Loader2, Calendar, MapPin, Users, ArrowRight, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// ── Filter helpers ─────────────────────────────────────────────────────────────

type FilterTab = "all" | "today" | "week" | "my";

function parseEventDate(dateStr: string): Date | null {
    try { return new Date(dateStr); } catch { return null; }
}

function isToday(dateStr: string): boolean {
    const d = parseEventDate(dateStr);
    if (!d) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
}

function isThisWeek(dateStr: string): boolean {
    const d = parseEventDate(dateStr);
    if (!d) return false;
    const now = new Date();
    const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= now && d <= weekOut;
}

// ── Featured hero card ─────────────────────────────────────────────────────────

const EVENT_GRADIENTS = [
    ["#e85c29", "#f59e0b"], ["#6366f1", "#8b5cf6"], ["#10b981", "#06b6d4"],
    ["#ec4899", "#f43f5e"], ["#3b82f6", "#6366f1"], ["#f59e0b", "#ef4444"],
    ["#8b5cf6", "#ec4899"], ["#06b6d4", "#3b82f6"],
];
function getEventGradient(title: string): string {
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    const [from, to] = EVENT_GRADIENTS[Math.abs(hash) % EVENT_GRADIENTS.length];
    return `linear-gradient(135deg, ${from}, ${to})`;
}

function FeaturedEvent({ event }: { event: Event }) {
    return (
        <Link href={`/events/${event.id}`}>
            <div className="relative w-full h-72 rounded-3xl overflow-hidden group cursor-pointer mb-10">
                {/* Background */}
                {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                    <div className="absolute inset-0" style={{ background: getEventGradient(event.title) }} />
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />

                {/* Badge */}
                <div className="absolute top-5 left-5">
                    <span className="bg-accent text-white text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                        Featured
                    </span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-7">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight mb-2 line-clamp-1">{event.title}</h2>
                            <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm font-bold">
                                <span className="flex items-center gap-1.5"><Calendar size={13} /> {event.date}</span>
                                <span className="flex items-center gap-1.5"><MapPin size={13} /> {event.location}</span>
                                <span className="flex items-center gap-1.5"><Users size={13} /> {event.attendees?.length || 0} attending</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-full transition-all">
                            View Event <ArrowRight size={14} />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function EventsPage() {
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<FilterTab>("all");
    const { user } = useAuth();

    useEffect(() => {
        (async () => {
            const { events: data, lastDoc: newLast } = await eventService.getAllEvents(20);
            setAllEvents(data);
            setLastDoc(newLast);
            setHasMore(data.length === 20);
            setLoading(false);
        })();
    }, []);

    const handleLoadMore = async () => {
        if (!lastDoc || loadingMore) return;
        setLoadingMore(true);
        const { events: more, lastDoc: newLast } = await eventService.getAllEvents(20, lastDoc);
        setAllEvents(prev => [...prev, ...more]);
        setLastDoc(newLast);
        setHasMore(more.length === 20);
        setLoadingMore(false);
    };

    // ── Filtered list ──────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = allEvents;

        // Tab filter
        if (activeTab === "today") list = list.filter(e => isToday(e.date));
        else if (activeTab === "week") list = list.filter(e => isThisWeek(e.date));
        else if (activeTab === "my" && user) list = list.filter(e => e.creatorId === user.uid || e.attendees?.includes(user.uid));

        // Search filter
        const q = search.trim().toLowerCase();
        if (q) list = list.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q) ||
            e.location?.toLowerCase().includes(q)
        );

        return list;
    }, [allEvents, activeTab, search, user]);

    // Featured = first event with a cover image (or just first event)
    const featured = allEvents.find(e => e.imageUrl) ?? allEvents[0];
    const showFeatured = activeTab === "all" && !search && featured;

    const TABS: { id: FilterTab; label: string }[] = [
        { id: "all",   label: "All Events" },
        { id: "today", label: "Today" },
        { id: "week",  label: "This Week" },
        { id: "my",    label: "My Events" },
    ];

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] pt-20 pb-24">
            <main className="max-w-7xl mx-auto px-6 lg:px-8">

                {/* ── Page header ──────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-10 pb-8">
                    <div>
                        <h1 className="text-4xl font-black text-surface-dark dark:text-white tracking-tight">
                            Discover Events
                        </h1>
                        <p className="text-surface-dark/50 dark:text-white/50 font-medium mt-1">
                            {allEvents.length > 0
                                ? `${allEvents.length} event${allEvents.length !== 1 ? "s" : ""} happening${hasMore ? "+" : ""}`
                                : "Explore what's happening in your community"}
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-dark/30 dark:text-white/30" size={16} />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl text-sm font-medium text-surface-dark dark:text-white placeholder:text-surface-dark/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        />
                    </div>
                </div>

                {/* ── Filter tabs ───────────────────────────────────────────── */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
                    {TABS.map(tab => {
                        // Count per tab
                        let count = allEvents.length;
                        if (tab.id === "today") count = allEvents.filter(e => isToday(e.date)).length;
                        else if (tab.id === "week") count = allEvents.filter(e => isThisWeek(e.date)).length;
                        else if (tab.id === "my" && user) count = allEvents.filter(e => e.creatorId === user.uid || e.attendees?.includes(user.uid)).length;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black whitespace-nowrap transition-all border",
                                    activeTab === tab.id
                                        ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
                                        : "bg-transparent border-surface-dark/10 dark:border-white/10 text-surface-dark/50 dark:text-white/50 hover:border-accent/40 hover:text-surface-dark dark:hover:text-white"
                                )}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span className={cn(
                                        "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                                        activeTab === tab.id ? "bg-white/20 text-white" : "bg-surface-dark/8 dark:bg-white/10 text-surface-dark/40 dark:text-white/40"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* Create event shortcut */}
                    {user && (
                        <Link href="/events/create" className="ml-auto shrink-0">
                            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-sm font-black border border-accent shadow-sm shadow-accent/20 hover:bg-accent/90 transition-all">
                                <Plus size={14} strokeWidth={3} /> New Event
                            </button>
                        </Link>
                    )}
                </div>

                {/* ── Content ──────────────────────────────────────────────── */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 text-accent">
                        <Loader2 className="animate-spin mb-3" size={36} />
                        <span className="font-bold text-sm text-surface-dark/40 dark:text-white/40">Loading events...</span>
                    </div>
                ) : (
                    <>
                        {/* Featured hero */}
                        {showFeatured && <FeaturedEvent event={featured} />}

                        {filtered.length > 0 ? (
                            <>
                                {/* Section label when search or filter is active */}
                                {(search || activeTab !== "all") && (
                                    <p className="text-xs font-black text-surface-dark/30 dark:text-white/30 uppercase tracking-widest mb-5">
                                        {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                                    </p>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                                    {filtered.map(event => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>

                                {hasMore && !search && activeTab === "all" && (
                                    <div className="flex justify-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="flex items-center gap-2 px-8 py-3 rounded-full border border-surface-dark/12 dark:border-white/10 text-surface-dark/60 dark:text-white/60 text-sm font-black hover:border-accent/40 hover:text-accent transition-all disabled:opacity-50"
                                        >
                                            {loadingMore
                                                ? <><Loader2 className="animate-spin" size={16} /> Loading...</>
                                                : "Load more events"
                                            }
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-32 rounded-3xl border-2 border-dashed border-surface-dark/8 dark:border-white/8">
                                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
                                    <Calendar size={28} />
                                </div>
                                <h3 className="text-xl font-black text-surface-dark dark:text-white mb-2">
                                    {search ? `No results for "${search}"` : activeTab === "my" ? "No events yet" : "Nothing here yet"}
                                </h3>
                                <p className="text-sm text-surface-dark/50 dark:text-white/50 max-w-xs mx-auto mb-6 font-medium">
                                    {search
                                        ? "Try a different search term or browse all events."
                                        : activeTab === "my"
                                        ? "Events you create or RSVP to will appear here."
                                        : "Check back soon or be the first to host one."}
                                </p>
                                {search ? (
                                    <button onClick={() => setSearch("")} className="text-sm font-black text-accent hover:underline">
                                        Clear search
                                    </button>
                                ) : activeTab === "my" && user ? (
                                    <Link href="/events/create">
                                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white text-sm font-black mx-auto">
                                            <Plus size={14} /> Create your first event
                                        </button>
                                    </Link>
                                ) : null}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
