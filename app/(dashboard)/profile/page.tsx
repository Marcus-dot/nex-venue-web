"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
    Loader2, LogOut, Settings, Calendar, MessageSquare,
    Shield, Clock, HelpCircle, Heart, Users, ChevronRight,
    Linkedin, Twitter, Globe, MapPin, Edit3, Shirt,
    Utensils, Zap, ExternalLink, User
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { eventService } from "@/services/events";
import { Event } from "@/types/events";
import { cn } from "@/lib/utils/cn";

const NETWORKING_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    open:          { label: "Open to Networking", dot: "bg-green-500",  bg: "bg-green-500/10",  text: "text-green-600 dark:text-green-400" },
    selective:     { label: "Selective",          dot: "bg-amber-400",  bg: "bg-amber-500/10",  text: "text-amber-600 dark:text-amber-400" },
    not_available: { label: "Not Available",      dot: "bg-surface-dark/30 dark:bg-white/30", bg: "bg-surface-dark/8 dark:bg-white/8", text: "text-surface-dark/50 dark:text-white/40" },
};

export default function ProfilePage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [stats, setStats]       = useState({ eventsCreated: 0, eventsAttending: 0, totalAttendees: 0 });
    const [createdEvents, setCreatedEvents]   = useState<Event[]>([]);
    const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        if (!authLoading && !user) router.push("/login?redirect=/profile");
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        (async () => {
            try {
                const [created, attending] = await Promise.all([
                    eventService.getEventsByCreator(user.uid),
                    eventService.getAttendingEvents(user.uid),
                ]);
                setCreatedEvents(created);
                // Exclude events the user created — they already appear under "My Events"
                setAttendingEvents(attending.filter(e => e.creatorId !== user.uid));
                setStats({
                    eventsCreated:   created.length,
                    eventsAttending: attending.length,
                    totalAttendees:  created.reduce((a, e) => a + (e.attendees?.length || 0), 0),
                });
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.uid]);

    const getEventRole = (event: Event): { label: string; bg: string; text: string } => {
        if (!user) return { label: "Attendee", bg: "bg-surface-dark/5 dark:bg-white/5", text: "text-surface-dark/40 dark:text-white/40" };
        if (event.organisers?.includes(user.uid)) return { label: "Organiser", bg: "bg-purple-500/10", text: "text-purple-500 dark:text-purple-400" };
        if (event.speakers?.includes(user.uid))   return { label: "Speaker",   bg: "bg-blue-500/10",   text: "text-blue-500 dark:text-blue-400" };
        if (event.exhibitors?.includes(user.uid)) return { label: "Exhibitor", bg: "bg-green-500/10",  text: "text-green-500 dark:text-green-400" };
        return { label: "Attendee", bg: "bg-surface-dark/5 dark:bg-white/5", text: "text-surface-dark/40 dark:text-white/40" };
    };

    const handleLogout = async () => { await signOut(auth); router.push("/"); };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={44} />
            </div>
        );
    }
    if (!user) return null;

    const networking = profile?.networkingAvailability ? NETWORKING_CONFIG[profile.networkingAvailability] : null;
    const hasSocial  = profile?.linkedinUrl || profile?.twitterHandle || profile?.websiteUrl;
    const hasPrefs   = (profile?.eventInterests?.length ?? 0) > 0 || profile?.dietaryRestrictions || profile?.tshirtSize;

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] pt-20 pb-24">
            <div className="max-w-5xl mx-auto px-6 space-y-6">

                {/* ── Hero card ─────────────────────────────────────────────── */}
                <div className="relative shadow-xl shadow-black/5 dark:shadow-black/30">
                    {/* Cover banner */}
                    <div className="relative h-44 rounded-t-3xl overflow-hidden">
                        {profile?.coverImage ? (
                            <img src={profile.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 bg-premium-gradient" />
                        )}
                        {/* dot texture */}
                        <div
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                                backgroundSize: "28px 28px",
                            }}
                        />
                        {/* Edit button */}
                        <button
                            onClick={() => router.push("/profile/edit")}
                            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-black uppercase tracking-widest transition-all"
                        >
                            <Edit3 size={13} /> Edit Profile
                        </button>
                    </div>

                    {/* Avatar — bridging the seam, outside both sections */}
                    <div className="absolute left-8 z-10" style={{ top: "calc(11rem - 48px)" }}>
                        <div className="ring-4 ring-white dark:ring-[#0f101e] rounded-full shadow-xl">
                            <AvatarDisplay
                                avatarUrl={profile?.avatar ?? null}
                                fullName={profile?.fullName}
                                size={96}
                            />
                        </div>
                    </div>

                    {/* Identity area */}
                    <div className="bg-white/60 dark:bg-[#1a1c2e]/90 backdrop-blur-xl px-8 pt-16 pb-7 rounded-b-3xl">
                        {/* Actions row — sits at top-right while avatar takes top-left space */}
                        <div className="flex items-center justify-end gap-2 mb-5">
                            {hasSocial && (
                                <div className="flex items-center gap-1.5">
                                    {profile?.linkedinUrl && (
                                        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                           className="w-8 h-8 rounded-full bg-surface-dark/5 dark:bg-white/5 hover:bg-[#0077b5]/10 flex items-center justify-center text-surface-dark/40 dark:text-white/40 hover:text-[#0077b5] transition-all">
                                            <Linkedin size={15} />
                                        </a>
                                    )}
                                    {profile?.twitterHandle && (
                                        <a href={`https://twitter.com/${profile.twitterHandle}`} target="_blank" rel="noopener noreferrer"
                                           className="w-8 h-8 rounded-full bg-surface-dark/5 dark:bg-white/5 hover:bg-[#1DA1F2]/10 flex items-center justify-center text-surface-dark/40 dark:text-white/40 hover:text-[#1DA1F2] transition-all">
                                            <Twitter size={15} />
                                        </a>
                                    )}
                                    {profile?.websiteUrl && (
                                        <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                                           className="w-8 h-8 rounded-full bg-surface-dark/5 dark:bg-white/5 hover:bg-accent/10 flex items-center justify-center text-surface-dark/40 dark:text-white/40 hover:text-accent transition-all">
                                            <Globe size={15} />
                                        </a>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => router.push("/chat")}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-surface-dark/10 dark:border-white/10 text-surface-dark/60 dark:text-white/60 hover:border-accent/40 hover:text-accent text-xs font-bold transition-all"
                            >
                                <MessageSquare size={13} /> Messages
                            </button>
                        </div>

                        {/* Name + meta */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-black text-surface-dark dark:text-white tracking-tight">
                                    {profile?.fullName || "NexVenue User"}
                                </h1>
                                {profile?.role === "admin" && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-white text-[10px] font-black uppercase tracking-widest">
                                        <Shield size={10} /> Admin
                                    </span>
                                )}
                            </div>

                            {(profile?.jobTitle || profile?.company) && (
                                <p className="text-sm font-semibold text-surface-dark/60 dark:text-white/50">
                                    {[profile.jobTitle, profile.company].filter(Boolean).join(" · ")}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {profile?.industry && (
                                    <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-black uppercase tracking-wider">
                                        {profile.industry}
                                    </span>
                                )}
                                {networking && (
                                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold", networking.bg, networking.text)}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full", networking.dot)} />
                                        {networking.label}
                                    </span>
                                )}
                                <span className="text-[11px] font-bold text-surface-dark/30 dark:text-white/30">
                                    Member since {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : "2026"}
                                </span>
                            </div>

                            {profile?.bio && (
                                <p className="text-sm text-surface-dark/60 dark:text-white/60 leading-relaxed max-w-xl pt-1">
                                    {profile.bio}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Stats row ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Events Created",  value: stats.eventsCreated,   icon: Calendar, accent: "text-accent",      glow: "bg-accent/10" },
                        { label: "Attending",        value: stats.eventsAttending, icon: Heart,    accent: "text-green-500",   glow: "bg-green-500/10" },
                        { label: "Total Reach",      value: stats.totalAttendees,  icon: Users,    accent: "text-blue-500",    glow: "bg-blue-500/10" },
                    ].map((s) => (
                        <GlassCard key={s.label} className="!p-6 text-center hover:-translate-y-0.5 transition-transform">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3", s.glow, s.accent)}>
                                <s.icon size={20} />
                            </div>
                            <div className="text-3xl font-black text-surface-dark dark:text-white">{s.value}</div>
                            <div className="text-[11px] font-bold text-surface-dark/40 dark:text-white/40 uppercase tracking-widest mt-1">{s.label}</div>
                        </GlassCard>
                    ))}
                </div>

                {/* ── Main content ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left column: social + preferences + account menu */}
                    <div className="space-y-5">
                        {/* Preferences card */}
                        {hasPrefs && (
                            <GlassCard className="!p-6 space-y-5">
                                <h3 className="text-xs font-black text-surface-dark/30 dark:text-white/30 uppercase tracking-widest">Preferences</h3>

                                {(profile?.eventInterests?.length ?? 0) > 0 && (
                                    <div className="space-y-2.5">
                                        <p className="text-[11px] font-bold text-surface-dark/40 dark:text-white/40 flex items-center gap-1.5">
                                            <Zap size={11} className="text-accent" /> Interests
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {profile!.eventInterests!.map((interest) => (
                                                <span key={interest} className="px-2.5 py-1 rounded-full bg-accent/8 dark:bg-accent/10 text-accent text-[11px] font-bold">
                                                    {interest}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {profile?.dietaryRestrictions && profile.dietaryRestrictions !== "none" && (
                                    <div className="flex items-center justify-between pt-3 border-t border-surface-dark/5 dark:border-white/5">
                                        <span className="text-[11px] font-bold text-surface-dark/40 dark:text-white/40 flex items-center gap-1.5">
                                            <Utensils size={11} className="text-accent" /> Dietary
                                        </span>
                                        <span className="text-[11px] font-black text-surface-dark dark:text-white capitalize">
                                            {profile.dietaryRestrictions.replace("_", "-")}
                                        </span>
                                    </div>
                                )}

                                {profile?.tshirtSize && (
                                    <div className="flex items-center justify-between pt-3 border-t border-surface-dark/5 dark:border-white/5">
                                        <span className="text-[11px] font-bold text-surface-dark/40 dark:text-white/40 flex items-center gap-1.5">
                                            <Shirt size={11} className="text-accent" /> T-Shirt
                                        </span>
                                        <span className="text-[11px] font-black text-surface-dark dark:text-white">{profile.tshirtSize}</span>
                                    </div>
                                )}
                            </GlassCard>
                        )}

                        {/* Account menu */}
                        <GlassCard className="!p-2">
                            {[
                                { label: "Edit Profile",       icon: Edit3,       sub: "Update your details",       href: "/profile/edit" },
                                { label: "Direct Messages",    icon: MessageSquare, sub: "Your conversations",       href: "/chat" },
                                { label: "Preferences",        icon: Settings,    sub: "Theme & notifications",      href: "/settings" },
                                { label: "Help & Support",     icon: HelpCircle,  sub: "Get assistance",             href: undefined },
                            ].map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => item.href && router.push(item.href)}
                                    className="w-full px-4 py-3.5 flex items-center gap-3 rounded-2xl hover:bg-surface-dark/5 dark:hover:bg-white/5 transition-all group text-left"
                                >
                                    <item.icon size={16} className="text-surface-dark/30 dark:text-white/30 group-hover:text-accent transition-colors shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-surface-dark dark:text-white">{item.label}</div>
                                        <div className="text-[11px] text-surface-dark/30 dark:text-white/30 font-medium">{item.sub}</div>
                                    </div>
                                    <ChevronRight size={14} className="text-surface-dark/20 dark:text-white/20 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                </button>
                            ))}
                            <div className="px-2 pt-1 pb-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-3 flex items-center gap-3 rounded-2xl hover:bg-red-500/5 text-red-500 transition-all font-bold text-sm"
                                >
                                    <LogOut size={16} className="shrink-0" />
                                    Sign Out
                                </button>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Right column: events */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* My Events */}
                        {createdEvents.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-base font-black text-surface-dark dark:text-white">My Events</h3>
                                    <button onClick={() => router.push("/events/create")} className="text-xs font-black text-accent hover:underline underline-offset-2">
                                        + New Event
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {createdEvents.map((event) => (
                                        <GlassCard key={event.id} className="!p-4 flex items-center gap-4 hover:border-accent/20 transition-colors">
                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                                                <Calendar size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-black text-surface-dark dark:text-white text-sm truncate">{event.title}</div>
                                                <div className="text-[11px] text-surface-dark/40 dark:text-white/40 font-medium flex items-center gap-1.5 mt-0.5">
                                                    <span>{event.date}</span>
                                                    {event.location && <><span>·</span><MapPin size={10} className="inline" /><span className="truncate">{event.location}</span></>}
                                                </div>
                                            </div>
                                            <Button onClick={() => router.push(`/events/${event.id}/manage`)} size="sm" className="font-black h-8 px-4 rounded-xl text-xs shrink-0">
                                                Manage
                                            </Button>
                                        </GlassCard>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Event Timeline */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-base font-black text-surface-dark dark:text-white">Attending</h3>
                                <button onClick={() => router.push("/events")} className="text-xs font-black text-accent hover:underline underline-offset-2">
                                    Explore Events
                                </button>
                            </div>

                            {attendingEvents.length === 0 ? (
                                <GlassCard className="!p-12 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center text-surface-dark/20 dark:text-white/20 mx-auto mb-5">
                                        <Clock size={32} />
                                    </div>
                                    <h4 className="text-base font-black text-surface-dark dark:text-white mb-2">Nothing yet</h4>
                                    <p className="text-sm text-surface-dark/50 dark:text-white/50 font-medium mb-6 max-w-xs mx-auto">
                                        Events you register for will appear here.
                                    </p>
                                    <Button size="sm" onClick={() => router.push("/events")} className="px-6 font-black">
                                        Browse Events
                                    </Button>
                                </GlassCard>
                            ) : (
                                <div className="space-y-2">
                                    {attendingEvents.map((event) => {
                                        const role = getEventRole(event);
                                        return (
                                            <GlassCard key={event.id} className="!p-4 flex items-center gap-4 hover:border-accent/20 transition-colors">
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", role.bg, role.text)}>
                                                    <Heart size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-surface-dark dark:text-white text-sm truncate">{event.title}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full", role.bg, role.text)}>
                                                            {role.label}
                                                        </span>
                                                        {event.date && (
                                                            <span className="text-[11px] text-surface-dark/30 dark:text-white/30 font-medium">{event.date}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => router.push(`/events/${event.id}`)}
                                                    className="flex items-center gap-1 text-xs font-bold text-accent hover:underline underline-offset-2 shrink-0"
                                                >
                                                    View <ExternalLink size={11} />
                                                </button>
                                            </GlassCard>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Admin panel */}
                        {profile?.role === "admin" && (
                            <GlassCard className="!p-6 border-l-4 border-l-accent">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                        <Shield size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-surface-dark dark:text-white text-sm">Administrative Access</h4>
                                        <p className="text-[11px] text-surface-dark/40 dark:text-white/40 font-medium">Elevated platform permissions</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { title: "User Management", sub: "Audit and manage users" },
                                        { title: "Moderation Tools", sub: "Review flagged content" },
                                    ].map((item) => (
                                        <div key={item.title} className="p-3.5 rounded-xl bg-surface-dark/5 dark:bg-white/5">
                                            <div className="text-sm font-black text-surface-dark dark:text-white mb-0.5">{item.title}</div>
                                            <div className="text-[11px] text-surface-dark/40 dark:text-white/40 font-medium">{item.sub}</div>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
