"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { GlassCard } from "@/components/ui/GlassCard";
import { UserProfile } from "@/types/auth";
import { Event } from "@/types/events";
import { eventService } from "@/services/events";
import {
    ArrowLeft, Loader2, Briefcase,
    Linkedin, Twitter, Globe, Tag, MessageSquare, Calendar, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

const NETWORKING_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    open:          { label: "Open to Networking", dot: "bg-green-500",  bg: "bg-green-500/10",  text: "text-green-600 dark:text-green-400" },
    selective:     { label: "Selective",           dot: "bg-amber-400",  bg: "bg-amber-500/10",  text: "text-amber-600 dark:text-amber-400" },
    not_available: { label: "Not Available",       dot: "bg-white/30",   bg: "bg-white/8",       text: "text-surface-dark/50 dark:text-white/40" },
};

// Read any user's profile from Firestore without touching global auth state
async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch {
        return null;
    }
}

export default function PublicProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [userEvents, setUserEvents] = useState<{ event: Event; role: string; roleStyle: { bg: string; text: string } }[]>([]);

    useEffect(() => {
        if (!userId) return;
        getUserProfile(userId).then((p) => {
            if (!p) setNotFound(true);
            else setProfile(p);
            setLoading(false);
        });

        // Load events this user participates in
        Promise.all([
            eventService.getEventsByCreator(userId),
            eventService.getAttendingEvents(userId),
        ]).then(([created, attending]) => {
            const roleStyles: Record<string, { bg: string; text: string }> = {
                Creator:   { bg: "bg-accent/10",        text: "text-accent" },
                Organiser: { bg: "bg-purple-500/10",    text: "text-purple-500 dark:text-purple-400" },
                Speaker:   { bg: "bg-blue-500/10",      text: "text-blue-500 dark:text-blue-400" },
                Exhibitor: { bg: "bg-green-500/10",     text: "text-green-500 dark:text-green-400" },
                Attendee:  { bg: "bg-surface-dark/5 dark:bg-white/5", text: "text-surface-dark/40 dark:text-white/40" },
            };

            const getRole = (event: Event): string => {
                if (event.creatorId === userId) return "Creator";
                if (event.organisers?.includes(userId)) return "Organiser";
                if (event.speakers?.includes(userId)) return "Speaker";
                if (event.exhibitors?.includes(userId)) return "Exhibitor";
                return "Attendee";
            };

            // Merge: created events + attending (deduplicated by id)
            const seen = new Set<string>();
            const merged: { event: Event; role: string; roleStyle: { bg: string; text: string } }[] = [];
            for (const e of [...created, ...attending]) {
                if (seen.has(e.id)) continue;
                seen.add(e.id);
                const role = getRole(e);
                merged.push({ event: e, role, roleStyle: roleStyles[role] });
            }
            // Sort: creator/organiser/speaker roles first, then attendees
            const roleOrder: Record<string, number> = { Creator: 0, Organiser: 1, Speaker: 2, Exhibitor: 3, Attendee: 4 };
            merged.sort((a, b) => (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5));
            setUserEvents(merged);
        });
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={40} />
            </div>
        );
    }

    if (notFound || !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-[#0f101e] gap-4">
                <p className="text-xl font-black text-surface-dark dark:text-white">Profile not found</p>
                <button onClick={() => router.back()} className="text-sm font-bold text-accent hover:underline flex items-center gap-1.5">
                    <ArrowLeft size={14} /> Go back
                </button>
            </div>
        );
    }

    const networking = profile.networkingAvailability ? NETWORKING_CONFIG[profile.networkingAvailability] : null;
    const hasSocial = profile.linkedinUrl || profile.twitterHandle || profile.websiteUrl;

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] pt-20 pb-24">
            <div className="max-w-2xl mx-auto px-6">

                {/* Back */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-surface-dark/50 dark:text-white/50 hover:text-accent font-bold text-sm mb-8 transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                {/* Hero card */}
                <div className="relative shadow-xl shadow-black/5 dark:shadow-black/20 mb-6">
                    {/* Cover */}
                    <div className="relative h-36 rounded-t-3xl overflow-hidden">
                        {profile.coverImage ? (
                            <img src={profile.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 bg-premium-gradient" />
                        )}
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }}
                        />
                    </div>

                    {/* Avatar */}
                    <div className="absolute left-6 z-10" style={{ top: "calc(9rem - 40px)" }}>
                        <div className="ring-4 ring-white dark:ring-[#0f101e] rounded-full shadow-xl">
                            <AvatarDisplay avatarUrl={profile.avatar ?? null} fullName={profile.fullName} size={80} />
                        </div>
                    </div>

                    {/* Identity */}
                    <div className="bg-white/60 dark:bg-[#1a1c2e]/90 backdrop-blur-xl px-6 pt-14 pb-6 rounded-b-3xl">
                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 mb-4">
                            {hasSocial && (
                                <div className="flex items-center gap-1.5">
                                    {profile.linkedinUrl && (
                                        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                           className="w-8 h-8 rounded-full bg-surface-dark/5 dark:bg-white/5 hover:bg-[#0077b5]/10 flex items-center justify-center text-surface-dark/40 dark:text-white/40 hover:text-[#0077b5] transition-all">
                                            <Linkedin size={14} />
                                        </a>
                                    )}
                                    {profile.twitterHandle && (
                                        <a href={`https://twitter.com/${profile.twitterHandle}`} target="_blank" rel="noopener noreferrer"
                                           className="w-8 h-8 rounded-full bg-surface-dark/5 dark:bg-white/5 hover:bg-[#1DA1F2]/10 flex items-center justify-center text-surface-dark/40 dark:text-white/40 hover:text-[#1DA1F2] transition-all">
                                            <Twitter size={14} />
                                        </a>
                                    )}
                                    {profile.websiteUrl && (
                                        <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                                           className="w-8 h-8 rounded-full bg-surface-dark/5 dark:bg-white/5 hover:bg-accent/10 flex items-center justify-center text-surface-dark/40 dark:text-white/40 hover:text-accent transition-all">
                                            <Globe size={14} />
                                        </a>
                                    )}
                                </div>
                            )}
                            <Link href="/chat"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-surface-dark/10 dark:border-white/10 text-surface-dark/60 dark:text-white/60 hover:border-accent/40 hover:text-accent text-xs font-bold transition-all">
                                <MessageSquare size={12} /> Message
                            </Link>
                        </div>

                        {/* Name + meta */}
                        <h1 className="text-2xl font-black text-surface-dark dark:text-white tracking-tight mb-1">
                            {profile.fullName || "NexVenue User"}
                        </h1>

                        {(profile.jobTitle || profile.company) && (
                            <p className="text-sm font-semibold text-surface-dark/60 dark:text-white/50 flex items-center gap-1.5 mb-2">
                                <Briefcase size={13} className="text-surface-dark/30 dark:text-white/30" />
                                {[profile.jobTitle, profile.company].filter(Boolean).join(" · ")}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {profile.industry && (
                                <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-black uppercase tracking-wider">
                                    {profile.industry}
                                </span>
                            )}
                            {networking && (
                                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold", networking.bg, networking.text)}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full", networking.dot)} />
                                    {networking.label}
                                </span>
                            )}
                        </div>

                        {profile.bio && (
                            <p className="text-sm text-surface-dark/60 dark:text-white/60 leading-relaxed mt-3 font-medium">
                                {profile.bio}
                            </p>
                        )}
                    </div>
                </div>

                {/* Event interests */}
                {(profile.eventInterests?.length ?? 0) > 0 && (
                    <GlassCard className="!p-5 mb-4">
                        <p className="text-xs font-black text-surface-dark/30 dark:text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Tag size={12} /> Interests
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {profile.eventInterests!.map(i => (
                                <span key={i} className="px-3 py-1 rounded-full bg-surface-dark/5 dark:bg-white/5 text-surface-dark/70 dark:text-white/70 text-xs font-bold border border-surface-dark/8 dark:border-white/8">
                                    {i}
                                </span>
                            ))}
                        </div>
                    </GlassCard>
                )}

                {/* Events */}
                {userEvents.length > 0 && (
                    <GlassCard className="!p-5">
                        <p className="text-xs font-black text-surface-dark/30 dark:text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Calendar size={12} /> Events
                        </p>
                        <div className="space-y-2">
                            {userEvents.map(({ event, role, roleStyle }) => (
                                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-dark/3 dark:hover:bg-white/3 transition-colors group">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", roleStyle.bg, roleStyle.text)}>
                                        <Calendar size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-sm text-surface-dark dark:text-white truncate">{event.title}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={cn("text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full", roleStyle.bg, roleStyle.text)}>
                                                {role}
                                            </span>
                                            {event.date && (
                                                <span className="text-[11px] text-surface-dark/30 dark:text-white/30 font-medium">{event.date}</span>
                                            )}
                                        </div>
                                    </div>
                                    <Link
                                        href={`/events/${event.id}`}
                                        className="opacity-0 group-hover:opacity-100 text-accent transition-opacity shrink-0"
                                    >
                                        <ExternalLink size={14} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
