"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { eventService } from "@/services/events";
import { agendaService } from "@/services/agenda";
import { Event, EventParticipant } from "@/types/events";
import { AgendaItem } from "@/types/agenda";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Modal } from "@/components/ui/Modal";
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
    Info,
    Shield,
    Mic,
    Store
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import gsap from "gsap";

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

function getEventGradient(title: string): string {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const [from, to] = EVENT_GRADIENTS[Math.abs(hash) % EVENT_GRADIENTS.length];
    return `linear-gradient(135deg, ${from}, ${to})`;
}

export default function EventDetailsClient() {
    const { id } = useParams();
    const router = useRouter();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const [event, setEvent] = useState<Event | null>(null);
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [participants, setParticipants] = useState<EventParticipant[]>([]);
    const [loading, setLoading] = useState(true);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;

        let unsubscribeEvent: (() => void) | undefined;
        let unsubscribeAgenda: (() => void) | undefined;

        const fetchData = async () => {
            // Subscribe to real-time event updates to reflect attendee changes instantly
            unsubscribeEvent = eventService.subscribeToEvent(id as string, (data) => {
                if (data) {
                    setEvent(data);
                } else {
                    router.push("/events");
                }
                setLoading(false);
            });

            // Subscribe to real-time agenda
            unsubscribeAgenda = agendaService.subscribeToAgenda(id as string, (data) => {
                setAgenda(data);
            });

            // Fetch participants
            const participantsData = await eventService.getEventParticipants(id as string);
            setParticipants(participantsData);
        };

        fetchData();

        return () => {
            unsubscribeEvent?.();
            unsubscribeAgenda?.();
        };
    }, [id, router]);

    useEffect(() => {
        if (!loading && event) {
            const ctx = gsap.context(() => {
                gsap.from(".animate-up", {
                    y: 40,
                    opacity: 0,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: "power4.out"
                });
            }, containerRef);
            return () => ctx.revert();
        }
    }, [loading, event]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }
    if (!event) return null;

    const isAttending = user && event.attendees?.includes(user.uid);

    const handleRSVP = async () => {
        if (!user) {
            router.push(`/login?redirect=/events/${event.id}`);
            return;
        }

        setRsvpLoading(true);
        try {
            if (isAttending) {
                await eventService.leaveEvent(event.id, user.uid);
            } else {
                await eventService.joinEvent(event.id, user.uid);
            }
        } catch (error) {
            console.error("Error updating RSVP:", error);
        } finally {
            setRsvpLoading(false);
        }
    };

    const handleRequestRole = async (role: 'organiser' | 'speaker' | 'exhibitor') => {
        if (!user) return;
        setRequestLoading(true);
        try {
            await eventService.requestEventRole({
                eventId: event.id,
                userId: user.uid,
                userName: profile?.fullName || user.email?.split('@')[0] || "User",
                userEmail: user.email || undefined,
                userPhone: user.phoneNumber || undefined,
                requestedRole: role,
            });
            setIsRequestModalOpen(false);
            showToast("Request sent successfully! The organizers will review it.", "success");
        } catch (error) {
            console.error("Error requesting role:", error);
            showToast("Failed to send request. Please try again.", "error");
        } finally {
            setRequestLoading(false);
        }
    };

    const roles: { id: 'organiser' | 'speaker' | 'exhibitor', label: string, icon: any, desc: string }[] = [
        { id: 'organiser', label: 'Organiser', icon: Shield, desc: 'Assist in managing the event and reviewing requests.' },
        { id: 'speaker', label: 'Speaker', icon: Mic, desc: 'Present a session or host a workshop.' },
        { id: 'exhibitor', label: 'Exhibitor', icon: Store, desc: 'Showcase your company or products with a booth.' },
    ];

    const isOrganiser = user && event.organisers?.includes(user.uid);
    const isSpeaker = user && event.speakers?.includes(user.uid);
    const isExhibitor = user && event.exhibitors?.includes(user.uid);
    const isStaff = isOrganiser || isSpeaker || isExhibitor || user?.uid === event.creatorId;

    return (
        <div ref={containerRef} className="min-h-screen pb-20">
            {/* Dynamic Background */}
            <div
                className="fixed top-0 left-0 w-full h-[60vh] -z-10 overflow-hidden"
                style={{ background: getEventGradient(event.title) }}
            >
                {event.imageUrl && (
                    <div className="absolute inset-0">
                        <img
                            src={event.imageUrl}
                            alt=""
                            className="w-full h-full object-cover opacity-60 blur-[2px]"
                        />
                    </div>
                )}
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-black/30 to-[#fafaf8] dark:to-[#0f101e]" />
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
                        <h3 className="text-2xl font-black text-surface-dark dark:text-white mb-6 flex items-center gap-2">
                            <Info size={24} className="text-accent" /> About this event
                        </h3>
                        <div className="prose prose-lg text-surface-dark/70 dark:text-white/70 leading-relaxed font-medium">
                            {event.description}
                        </div>
                    </GlassCard>

                    {/* Agenda Section */}
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-3xl font-black text-surface-dark dark:text-white">Event Schedule</h3>
                            <div className="flex items-center gap-2 text-surface-dark/40 dark:text-white/40 text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-green-500" /> Live Updates Enabled
                            </div>
                        </div>
                        <AgendaList items={agenda} currentId={event.currentAgendaItem} />
                    </div>

                    {/* Speakers Section */}
                    {participants.filter(p => p.role === 'speaker').length > 0 && (
                        <div>
                            <h3 className="text-3xl font-black text-surface-dark dark:text-white mb-8 flex items-center gap-3">
                                <Mic size={28} className="text-accent" /> Featured Speakers
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {participants.filter(p => p.role === 'speaker').map(speaker => (
                                    <GlassCard key={speaker.id} className="!p-6 flex flex-col gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-2xl">
                                                {speaker.displayName[0]}
                                            </div>
                                            <div>
                                                <div className="text-xl font-black text-surface-dark dark:text-white">{speaker.displayName}</div>
                                                <div className="text-sm font-bold text-accent uppercase tracking-wider">{speaker.company || "Guest Speaker"}</div>
                                            </div>
                                        </div>
                                        <p className="text-surface-dark/60 dark:text-white/60 font-medium line-clamp-3">
                                            {speaker.bio || "No bio provided."}
                                        </p>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Exhibitors Section */}
                    {participants.filter(p => p.role === 'exhibitor').length > 0 && (
                        <div>
                            <h3 className="text-3xl font-black text-surface-dark dark:text-white mb-8 flex items-center gap-3">
                                <Store size={28} className="text-accent" /> Virtual Exhibitors
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {participants.filter(p => p.role === 'exhibitor').map(exhibitor => (
                                    <GlassCard key={exhibitor.id} className="!p-6 flex flex-col gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-xl bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center text-surface-dark/40 dark:text-white/40">
                                                <Store size={32} />
                                            </div>
                                            <div>
                                                <div className="text-xl font-black text-surface-dark dark:text-white">{exhibitor.company || exhibitor.displayName}</div>
                                                <div className="text-sm font-bold text-surface-dark/40 dark:text-white/40 uppercase tracking-wider italic">Exhibitor Booth</div>
                                            </div>
                                        </div>
                                        <p className="text-surface-dark/60 dark:text-white/60 font-medium line-clamp-3">
                                            {exhibitor.boothDetails || "No details provided."}
                                        </p>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: CTA & Organizers */}
                <div className="space-y-8 animate-up">
                    <GlassCard className="sticky top-28 !p-8 border-2 border-accent/20">
                        <div className="mb-6">
                            <div className="text-sm font-bold text-surface-dark/40 dark:text-white/40 uppercase tracking-widest mb-1">Status</div>
                            <div className="text-3xl font-black text-surface-dark dark:text-white">Registration Open</div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <Button
                                className="w-full text-lg !py-5"
                                onClick={handleRSVP}
                                disabled={rsvpLoading}
                                variant={isAttending ? "secondary" : "primary"}
                            >
                                {rsvpLoading ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : isAttending ? (
                                    "Leave Event"
                                ) : (
                                    "Join Event"
                                )}
                            </Button>
                            
                            {isAttending && !isStaff && (
                                <Button 
                                    variant="outline" 
                                    className="w-full text-lg !py-5 gap-2"
                                    onClick={() => setIsRequestModalOpen(true)}
                                >
                                    Apply for Staff Role
                                </Button>
                            )}

                            {isStaff && (
                                <Link href={`/events/${event.id}/manage`} className="block">
                                    <Button variant="outline" className="w-full text-lg !py-5 gap-2 border-accent text-accent">
                                        <Shield size={20} /> Event Management
                                    </Button>
                                </Link>
                            )}

                            {isAttending && (
                                <Link href={`/chat?id=${event.id}&type=event&name=${encodeURIComponent(event.title)}`} className="block">
                                    <Button variant="ghost" className="w-full text-lg !py-5">Join Discussion</Button>
                                </Link>
                            )}
                        </div>

                        <div className="pt-8 border-t border-surface-dark/10 dark:border-white/10">
                            <h4 className="font-black text-surface-dark dark:text-white mb-4">Organized by</h4>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black">
                                    {event.creatorName?.[0]}
                                </div>
                                <div>
                                    <div className="font-black text-surface-dark dark:text-white">{event.creatorName}</div>
                                    <div className="text-xs text-surface-dark/40 dark:text-white/40 font-bold uppercase">Event Host</div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="!p-8">
                        <h4 className="font-black text-surface-dark dark:text-white mb-6">Attendees</h4>
                        <div className="flex items-center -space-x-3 mb-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full bg-surface-dark/10 dark:bg-white/10 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-black dark:text-white">
                                    A{i}
                                </div>
                            ))}
                            <div className="w-10 h-10 rounded-full bg-accent text-white border-2 border-white flex items-center justify-center text-[10px] font-black">
                                +{Math.max(0, (event.attendees?.length || 0) - 5)}
                            </div>
                        </div>
                        <p className="text-sm text-surface-dark/60 dark:text-white/60 font-medium">
                            Join {event.attendees?.length || 0} others at this event.
                        </p>
                    </GlassCard>
                </div>
            </main>

            <Modal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="Apply for a Role"
            >
                <div className="relative space-y-4">
                    <p className="text-surface-dark/60 dark:text-white/60 mb-6">
                        Select the role you'd like to apply for. The event organizers will review your request.
                    </p>
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => handleRequestRole(role.id)}
                            disabled={requestLoading}
                            className="w-full text-left p-4 rounded-xl border border-surface-dark/10 dark:border-white/10 hover:border-accent/40 hover:bg-accent/5 transition-all group flex items-start gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-12 h-12 rounded-lg bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center text-surface-dark/40 dark:text-white/40 group-hover:bg-accent/10 group-hover:text-accent transition-all shrink-0">
                                <role.icon size={24} />
                            </div>
                            <div>
                                <div className="font-black text-surface-dark dark:text-white group-hover:text-accent transition-colors">
                                    Apply as {role.label}
                                </div>
                                <div className="text-sm text-surface-dark/60 dark:text-white/60 font-medium">
                                    {role.desc}
                                </div>
                            </div>
                        </button>
                    ))}
                    {requestLoading && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                            <Loader2 className="animate-spin text-accent" size={32} />
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
