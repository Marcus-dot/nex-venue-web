"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { eventService } from "@/services/events";
import { agendaService } from "@/services/agenda";
import { attendanceRequestService } from "@/services/attendanceRequests";
import { checkInService } from "@/services/checkins";
import { Event, EventParticipant, AttendanceRequest } from "@/types/events";
import { AgendaItem } from "@/types/agenda";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Modal } from "@/components/ui/Modal";
import { AgendaList } from "@/components/features/AgendaList";
import { TicketModal } from "@/components/features/TicketModal";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { usersService, type UserSummary } from "@/services/users";
import {
    Calendar,
    MapPin,
    Users,
    ArrowLeft,
    Share2,
    Loader2,
    Clock,
    Info,
    Shield,
    Mic,
    Store,
    QrCode,
    type LucideIcon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import gsap from "gsap";

const EVENT_GRADIENTS = [
    ["#e85c29", "#f59e0b"],
    ["#d97706", "#fbbf24"],
    ["#c2410c", "#ea580c"],
    ["#f59e0b", "#fcd34d"],
    ["#9a3412", "#c2410c"],
    ["#b45309", "#f59e0b"],
    ["#e85c29", "#f59e0b"],
    ["#a33410", "#e85c29"],
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
    // Attendance request state for closed (approval-required) events.
    // undefined = not yet loaded, null = no request on record.
    const [attendanceReq, setAttendanceReq] = useState<AttendanceRequest | null | undefined>(undefined);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [showTicket, setShowTicket] = useState(false);
    const [checkedIn, setCheckedIn] = useState(false);
    const [attendeePreviews, setAttendeePreviews] = useState<UserSummary[]>([]);
    const [selectedSpeaker, setSelectedSpeaker] = useState<{ key: string; name: string; subtitle: string; photoUrl?: string; bio?: string } | null>(null);
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

    // For closed (approval-required) events, load this user's request status.
    useEffect(() => {
        if (!user || !event) return;
        const closed = event.isOpen === false;
        const attending = event.attendees?.includes(user.uid);
        if (!closed || attending) { setAttendanceReq(null); return; }
        let active = true;
        attendanceRequestService.getUserRequest(event.id, user.uid)
            .then((req) => { if (active) setAttendanceReq(req); });
        return () => { active = false; };
    }, [user, event]);

    // Reflect the attendee's check-in status on their ticket.
    useEffect(() => {
        if (!user || !event || !event.attendees?.includes(user.uid)) { setCheckedIn(false); return; }
        let active = true;
        checkInService.getCheckIn(event.id, user.uid)
            .then((ci) => { if (active) setCheckedIn(!!ci); })
            .catch(() => { /* non-fatal */ });
        return () => { active = false; };
    }, [user, event]);

    // Load a few real attendee avatars for the "Attendees" preview stack.
    useEffect(() => {
        const ids = (event?.attendees ?? []).slice(0, 12);
        if (ids.length === 0) { setAttendeePreviews([]); return; }
        let active = true;
        usersService.getUserSummaries(ids)
            .then((map) => { if (active) setAttendeePreviews(Object.values(map)); })
            .catch(() => { /* non-fatal */ });
        return () => { active = false; };
    }, [event?.attendees]);

    // Merge account-based speakers (EventParticipant, role=speaker) with curated
    // speaker cards (event.speakerProfiles); a curated card linked to an account
    // already shown as a participant is dropped to avoid duplicates.
    // NOTE: must stay above the early returns below, it's a hook.
    const displaySpeakers = useMemo(() => {
        const accountSpeakers = participants.filter(p => p.role === 'speaker');
        const accountIds = new Set(accountSpeakers.map(p => p.id));
        const fromAccounts = accountSpeakers.map(p => ({
            key: p.id,
            name: p.displayName,
            subtitle: p.company || "Guest Speaker",
            photoUrl: p.photoUrl,
            bio: p.bio,
        }));
        const fromProfiles = (event?.speakerProfiles ?? [])
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .filter(sp => !(sp.linkedUserId && accountIds.has(sp.linkedUserId)))
            .map(sp => ({
                key: sp.id,
                name: sp.name,
                subtitle: [sp.title, sp.company].filter(Boolean).join(" · ") || "Guest Speaker",
                photoUrl: sp.photoUrl,
                bio: sp.bio,
            }));
        return [...fromAccounts, ...fromProfiles];
    }, [participants, event?.speakerProfiles]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }
    if (!event) return null;

    const isAttending = user && event.attendees?.includes(user.uid);
    const atCapacity = !!event.maxAttendees && (event.attendees?.length || 0) >= event.maxAttendees;
    const isFull = atCapacity && !isAttending;
    const isClosed = event.isOpen === false;
    const hasPendingReq = attendanceReq?.status === "pending";
    // A closed event that this non-attending user still needs approval to join.
    const needsApproval = isClosed && !isAttending;

    const handleRequestAttendance = async () => {
        if (!user) {
            router.push(`/login?redirect=/events/${event.id}`);
            return;
        }
        setAttendanceLoading(true);
        try {
            await attendanceRequestService.createRequest(
                event.id,
                user.uid,
                profile?.fullName || user.email?.split("@")[0] || "Someone",
                user.phoneNumber || profile?.phoneNumber || "",
            );
            setAttendanceReq({ id: "pending", eventId: event.id, userId: user.uid, userName: profile?.fullName || "", status: "pending", timestamp: Date.now() });
            showToast("Request sent. The organisers will review it.", "success");
        } catch (err) {
            showToast((err as Error)?.message || "Could not send request. Please try again.", "error");
        } finally {
            setAttendanceLoading(false);
        }
    };

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
            if ((error as { code?: string })?.code === "event_full") showToast("This event is at full capacity.", "error");
            else showToast("Something went wrong. Please try again.", "error");
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

    const roles: { id: 'organiser' | 'speaker' | 'exhibitor', label: string, icon: LucideIcon, desc: string }[] = [
        { id: 'organiser', label: 'Organiser', icon: Shield, desc: 'Assist in managing the event and reviewing requests.' },
        { id: 'speaker', label: 'Speaker', icon: Mic, desc: 'Present a session or host a workshop.' },
        { id: 'exhibitor', label: 'Exhibitor', icon: Store, desc: 'Showcase your company or products with a booth.' },
    ];

    const isAdmin = profile?.role === "admin";
    const isOrganiser = user && event.organisers?.includes(user.uid);
    const isSpeaker = user && event.speakers?.includes(user.uid);
    const isExhibitor = user && event.exhibitors?.includes(user.uid);
    const isStaff = isOrganiser || isSpeaker || isExhibitor || user?.uid === event.creatorId;
    // Platform admins can manage any event even if they aren't listed as staff.
    const canManage = isStaff || isAdmin;

    const handleShare = async () => {
        const url = `${window.location.origin}/e/${event.id}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: event.title, url });
            } else {
                await navigator.clipboard.writeText(url);
                showToast("Event link copied to clipboard.", "success");
            }
        } catch {
            /* user dismissed the share sheet, no-op */
        }
    };

    const attendeeCount = event.attendees?.length ?? 0;

    return (
        <div ref={containerRef} className="relative min-h-screen pb-20">
            {/* Hero backdrop, absolute so it scrolls away with the hero instead of
                bleeding behind the whole page. Strong scrim keeps the white hero
                text legible over any banner (light posters included). */}
            <div
                className="absolute top-0 left-0 w-full h-[58vh] -z-10 overflow-hidden"
                style={{ background: getEventGradient(event.title) }}
            >
                {event.imageUrl && (
                    <img
                        src={event.imageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-45 blur-[3px] scale-105"
                    />
                )}
                {/* Darken top (nav + title) and fade to the page background at the bottom */}
                <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/45 to-[#fafaf8] dark:to-[#0f101e]" />
            </div>

            {/* Navigation */}
            <nav className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between relative z-10">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg"
                >
                    <ArrowLeft size={24} />
                </button>

                <button
                    onClick={handleShare}
                    aria-label="Share event"
                    className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg"
                >
                    <Share2 size={24} />
                </button>
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
                                <span className="font-bold text-lg">
                                    {event.maxAttendees
                                        ? `${event.attendees?.length || 0} / ${event.maxAttendees} Attending${(event.attendees?.length || 0) >= event.maxAttendees ? " · Full" : ""}`
                                        : `${event.attendees?.length || 0} Attending`}
                                </span>
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
                            <div className="flex items-center gap-2 text-surface-dark/55 dark:text-white/40 text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-green-500" /> Live Updates Enabled
                            </div>
                        </div>
                        <AgendaList items={agenda} currentId={event.currentAgendaItem} />
                    </div>

                    {/* Speakers Section */}
                    {displaySpeakers.length > 0 && (
                        <div>
                            <h3 className="text-3xl font-black text-surface-dark dark:text-white mb-8 flex items-center gap-3">
                                <Mic size={28} className="text-accent" /> Featured Speakers
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {displaySpeakers.map(speaker => (
                                    <GlassCard key={speaker.key} onClick={() => setSelectedSpeaker(speaker)} className="!p-6 flex flex-col gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-2xl overflow-hidden shrink-0">
                                                {speaker.photoUrl
                                                    ? <img src={speaker.photoUrl} alt={speaker.name} className="w-full h-full object-cover" />
                                                    : (speaker.name[0] || "?")
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xl font-black text-surface-dark dark:text-white truncate">{speaker.name}</div>
                                                <div className="text-sm font-bold text-accent uppercase tracking-wider">{speaker.subtitle}</div>
                                            </div>
                                        </div>
                                        <p className="text-surface-dark/60 dark:text-white/60 font-medium line-clamp-3">
                                            {speaker.bio || "No bio provided."}
                                        </p>
                                        {speaker.bio && (
                                            <span className="text-sm font-bold text-accent mt-auto">Read full bio →</span>
                                        )}
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
                                            <div className="w-16 h-16 rounded-xl bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center text-surface-dark/55 dark:text-white/40">
                                                <Store size={32} />
                                            </div>
                                            <div>
                                                <div className="text-xl font-black text-surface-dark dark:text-white">{exhibitor.company || exhibitor.displayName}</div>
                                                <div className="text-sm font-bold text-surface-dark/55 dark:text-white/40 uppercase tracking-wider italic">Exhibitor Booth</div>
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

                {/* Right Column: CTA & Organisers */}
                <div className="space-y-8 animate-up">
                    <GlassCard className="sticky top-28 !p-8 border-2 border-accent/20">
                        <div className="mb-6">
                            <div className="text-sm font-bold text-surface-dark/55 dark:text-white/40 uppercase tracking-widest mb-1">Status</div>
                            <div className="text-3xl font-black text-surface-dark dark:text-white">
                                {isAttending
                                    ? "You're Attending"
                                    : needsApproval
                                        ? (hasPendingReq ? "Approval Pending" : "Approval Required")
                                        : isFull
                                            ? "Registration Full"
                                            : "Registration Open"}
                            </div>
                            {needsApproval && !hasPendingReq && (
                                <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50 mt-2">
                                    This event requires organiser approval to attend.
                                </p>
                            )}
                        </div>

                        <div className="space-y-4 mb-8">
                            {needsApproval && !isFull ? (
                                <Button
                                    className="w-full text-lg !py-5"
                                    onClick={handleRequestAttendance}
                                    disabled={attendanceLoading || attendanceReq === undefined || hasPendingReq}
                                    variant={hasPendingReq ? "secondary" : "primary"}
                                >
                                    {attendanceLoading || attendanceReq === undefined ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : hasPendingReq ? (
                                        "Request Pending"
                                    ) : (
                                        "Request to Attend"
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    className="w-full text-lg !py-5"
                                    onClick={handleRSVP}
                                    disabled={rsvpLoading || isFull}
                                    variant={isAttending ? "secondary" : "primary"}
                                >
                                    {rsvpLoading ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : isFull ? (
                                        "Event Full"
                                    ) : isAttending ? (
                                        "Leave Event"
                                    ) : (
                                        "Join Event"
                                    )}
                                </Button>
                            )}

                            {isAttending && (
                                <Button
                                    variant="outline"
                                    className="w-full text-lg !py-5 gap-2"
                                    onClick={() => setShowTicket(true)}
                                >
                                    <QrCode size={20} /> View Ticket
                                </Button>
                            )}

                            {isAttending && !isStaff && !isAdmin && (
                                <Button
                                    variant="outline"
                                    className="w-full text-lg !py-5 gap-2"
                                    onClick={() => setIsRequestModalOpen(true)}
                                >
                                    Apply for Staff Role
                                </Button>
                            )}

                            {canManage && (
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
                            <h4 className="font-black text-surface-dark dark:text-white mb-4">Organised by</h4>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black">
                                    {event.creatorName?.[0]}
                                </div>
                                <div>
                                    <div className="font-black text-surface-dark dark:text-white">{event.creatorName}</div>
                                    <div className="text-xs text-surface-dark/55 dark:text-white/40 font-bold uppercase">Event Host</div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="!p-8">
                        <h4 className="font-black text-surface-dark dark:text-white mb-6">Attendees</h4>
                        {attendeeCount === 0 ? (
                            <p className="text-sm text-surface-dark/60 dark:text-white/60 font-medium">
                                No one has joined yet, be the first.
                            </p>
                        ) : (
                            <>
                                <div className="flex items-center -space-x-3 mb-4">
                                    {attendeePreviews.slice(0, 5).map((a) => (
                                        <Link
                                            key={a.uid}
                                            href={`/profile/${a.uid}`}
                                            title={a.fullName}
                                            className="rounded-full ring-2 ring-white dark:ring-gray-900 transition-transform hover:scale-110 hover:z-10"
                                        >
                                            <AvatarDisplay avatarUrl={a.avatar} fullName={a.fullName} size={40} />
                                        </Link>
                                    ))}
                                    {attendeeCount > 5 && (
                                        <div className="w-10 h-10 rounded-full bg-accent text-white ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-[11px] font-black">
                                            +{attendeeCount - 5}
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-surface-dark/60 dark:text-white/60 font-medium">
                                    {attendeeCount === 1 ? "1 person is attending." : `${attendeeCount} people are attending.`}
                                </p>
                            </>
                        )}
                    </GlassCard>
                </div>
            </main>

            {/* Speaker profile modal, full bio */}
            <Modal
                isOpen={!!selectedSpeaker}
                onClose={() => setSelectedSpeaker(null)}
                title="Speaker"
            >
                {selectedSpeaker && (
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-3xl overflow-hidden shrink-0">
                                {selectedSpeaker.photoUrl
                                    ? <img src={selectedSpeaker.photoUrl} alt={selectedSpeaker.name} className="w-full h-full object-cover" />
                                    : (selectedSpeaker.name[0] || "?")}
                            </div>
                            <div className="min-w-0">
                                <div className="text-2xl font-black text-surface-dark dark:text-white">{selectedSpeaker.name}</div>
                                <div className="text-sm font-bold text-accent uppercase tracking-wider">{selectedSpeaker.subtitle}</div>
                            </div>
                        </div>
                        <p className="text-surface-dark/70 dark:text-white/70 font-medium leading-relaxed whitespace-pre-line">
                            {selectedSpeaker.bio || "No bio provided."}
                        </p>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="Apply for a Role"
            >
                <div className="relative space-y-4">
                    <p className="text-surface-dark/60 dark:text-white/60 mb-6">
                        Select the role you&apos;d like to apply for. The event organisers will review your request.
                    </p>
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => handleRequestRole(role.id)}
                            disabled={requestLoading}
                            className="w-full text-left p-4 rounded-xl border border-surface-dark/10 dark:border-white/10 hover:border-accent/40 hover:bg-accent/5 transition-all group flex items-start gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-12 h-12 rounded-lg bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center text-surface-dark/55 dark:text-white/40 group-hover:bg-accent/10 group-hover:text-accent transition-all shrink-0">
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

            {user && (
                <TicketModal
                    isOpen={showTicket}
                    onClose={() => setShowTicket(false)}
                    eventId={event.id}
                    eventTitle={event.title}
                    attendeeName={profile?.fullName || user.email?.split("@")[0] || "Attendee"}
                    uid={user.uid}
                    checkedIn={checkedIn}
                />
            )}
        </div>
    );
}
