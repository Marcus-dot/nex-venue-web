"use client";

import { use, useEffect, useRef, useState } from "react";
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    doc,
    getDoc,
    getDocs,
    arrayUnion,
    updateDoc,
    setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { AnimatePresence, motion } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PollOption {
    id: string;
    text: string;
    votes: string[];
}

interface Poll {
    id: string;
    eventId: string;
    question: string;
    options: PollOption[];
    isActive: boolean;
    showResults: boolean;
    createdAt: number;
}

interface EventData {
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    imageUrl?: string;
    currentAgendaItem?: string | null;
}

interface AgendaItem {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    date: string;
    speaker?: string;
    speakerTitle?: string;
    speakerBio?: string;
    speakerImage?: string;
    speakerImages?: string[];
    category?: string;
    isBreak?: boolean;
    location?: string;
    order: number;
}

interface Question {
    id: string;
    text: string;
    authorName: string;
    isAnonymous: boolean;
    status: "pending" | "approved" | "answered" | "rejected";
    upvotes: string[];
    createdAt: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGuestId(): string {
    const key = "nex_guest_id";
    let id = localStorage.getItem(key);
    if (!id) {
        id = "guest_" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(key, id);
    }
    return id;
}

function toISODate(d: Date): string {
    return d.toISOString().split("T")[0];
}

function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

function formatDayHeading(dateStr: string): { weekday: string; dateLabel: string } {
    try {
        // Parse as local date to avoid timezone shifts
        const [y, mo, d] = dateStr.split("-").map(Number);
        const date = new Date(y, mo - 1, d);
        return {
            weekday: date.toLocaleDateString("en-GB", { weekday: "long" }),
            dateLabel: date.toLocaleDateString("en-GB", { day: "numeric", month: "long" }),
        };
    } catch {
        return { weekday: dateStr, dateLabel: "" };
    }
}

function formatEventDate(dateStr: string): string {
    try {
        const [y, mo, d] = dateStr.split("-").map(Number);
        return new Date(y, mo - 1, d).toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

function groupByDate(items: AgendaItem[]): [string, AgendaItem[]][] {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
        const key = item.date ?? "unknown";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function getSessionStatus(item: AgendaItem, todayStr: string, nowMinutes: number): "live" | "past" | "upcoming" | "future-day" {
    if (item.date > todayStr) return "future-day";
    if (item.date < todayStr) return "past";
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime || item.startTime) + (item.endTime ? 0 : 60);
    if (nowMinutes >= start && nowMinutes < end) return "live";
    if (nowMinutes >= end) return "past";
    return "upcoming";
}

const CATEGORY_LABELS: Record<string, string> = {
    keynote: "Keynote", panel: "Panel", workshop: "Workshop",
    presentation: "Presentation", networking: "Networking", fireside: "Fireside",
    demo: "Demo", case_study: "Case Study", remarks: "Remarks", break: "Break",
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function UpvoteIcon({ filled }: { filled: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth={filled ? 0 : 1.5}>
            <path d="M8 2L14 9H10V14H6V9H2L8 2Z" />
        </svg>
    );
}

function StarRating({ agendaItemId, eventId, guestId }: { agendaItemId: string; eventId: string; guestId: string }) {
    const [saved, setSaved] = useState<number>(0);
    const [hovered, setHovered] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const accent = "#e85c29";

    // Load existing rating on mount
    useEffect(() => {
        if (!guestId) return;
        getDoc(doc(db, "ratings", `${agendaItemId}_${guestId}`)).then((snap) => {
            if (snap.exists()) setSaved(snap.data().score ?? 0);
        });
    }, [agendaItemId, guestId]);

    async function rate(score: number) {
        if (saving) return;
        setSaving(true);
        setSaved(score);
        try {
            await setDoc(doc(db, "ratings", `${agendaItemId}_${guestId}`), {
                eventId,
                agendaItemId,
                userId: guestId,
                score,
                createdAt: Date.now(),
            }, { merge: true });
        } catch {
            // silent — optimistic update stays
        } finally {
            setSaving(false);
        }
    }

    const active = hovered || saved;

    return (
        <div>
            <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                {saved ? "Your rating" : "Rate this session"}
            </p>
            <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => rate(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        className="transition-transform active:scale-90"
                        style={{ transform: hovered === star ? "scale(1.2)" : "scale(1)", transition: "transform 0.12s ease" }}
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24"
                            fill={star <= active ? accent : "none"}
                            stroke={star <= active ? accent : "rgba(255,255,255,0.2)"}
                            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </button>
                ))}
                {saved > 0 && (
                    <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm font-semibold ml-1"
                        style={{ color: accent }}
                    >
                        {saved}/5
                    </motion.span>
                )}
            </div>
        </div>
    );
}

function AgendaCard({ item, status, eventId, guestId }: { item: AgendaItem; status: "live" | "past" | "upcoming" | "future-day"; eventId: string; guestId: string }) {
    const [expanded, setExpanded] = useState(false);
    const accent = "#e85c29";
    const isLive = status === "live";
    const isPast = status === "past";
    const hasSpeaker = !!item.speaker?.trim();
    const hasDetails = !!(item.description?.trim() || item.speakerBio?.trim()) || (isPast && !item.isBreak);
    const speakerPhoto = item.speakerImages?.[0] ?? item.speakerImage ?? null;
    const label = item.category && item.category !== "other" ? CATEGORY_LABELS[item.category] ?? null : null;

    // Breaks — minimal styling
    if (item.isBreak) {
        return (
            <div className="flex items-center gap-3 py-2.5 px-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.015)" }}>
                <span className="text-xs font-bold tabular-nums w-[52px] shrink-0"
                    style={{ color: isPast ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.3)" }}>
                    {item.startTime}
                </span>
                <span className="text-sm" style={{ color: isPast ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.35)" }}>
                    {item.title}
                </span>
            </div>
        );
    }

    return (
        <div
            className="rounded-xl overflow-hidden transition-all"
            style={{
                background: isLive
                    ? "rgba(232,92,41,0.08)"
                    : isPast
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(255,255,255,0.04)",
                border: isLive
                    ? "1px solid rgba(232,92,41,0.3)"
                    : isPast
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "1px solid rgba(255,255,255,0.07)",
            }}
        >
            <div
                className={hasDetails ? "cursor-pointer" : ""}
                onClick={() => hasDetails && setExpanded(!expanded)}
            >
                <div className="flex items-start gap-3 p-4">
                    {/* Live pulse / time */}
                    <div className="shrink-0 w-[52px] pt-0.5">
                        {isLive ? (
                            <div className="flex items-center gap-1.5 mb-1">
                                <motion.div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: accent }}
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                                />
                                <span className="text-xs font-black uppercase" style={{ color: accent, letterSpacing: "0.04em" }}>Live</span>
                            </div>
                        ) : null}
                        <span className="text-xs font-bold tabular-nums block"
                            style={{ color: isLive ? accent : isPast ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)" }}>
                            {item.startTime}
                        </span>
                        {item.endTime && (
                            <span className="text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.15)" }}>
                                {item.endTime}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {label && (
                            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5"
                                style={{
                                    background: isLive ? "rgba(232,92,41,0.2)" : "rgba(232,92,41,0.1)",
                                    color: isLive ? accent : "rgba(232,92,41,0.7)",
                                }}>
                                {label}
                            </span>
                        )}
                        <p className="font-semibold text-sm leading-snug"
                            style={{ color: isPast ? "rgba(255,255,255,0.4)" : "white" }}>
                            {item.title}
                        </p>

                        {hasSpeaker && (
                            <div className="flex items-center gap-2 mt-2">
                                {speakerPhoto ? (
                                    <img src={speakerPhoto} alt={item.speaker}
                                        className="w-7 h-7 rounded-full object-cover shrink-0"
                                        style={{
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            opacity: isPast ? 0.5 : 1,
                                        }} />
                                ) : (
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                        style={{
                                            background: isPast ? "rgba(255,255,255,0.06)" : "rgba(232,92,41,0.15)",
                                            color: isPast ? "rgba(255,255,255,0.3)" : accent,
                                        }}>
                                        {item.speaker!.trim()[0]}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-xs font-medium truncate"
                                        style={{ color: isPast ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)" }}>
                                        {item.speaker}
                                    </p>
                                    {item.speakerTitle && (
                                        <p className="text-xs truncate"
                                            style={{ color: isPast ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.3)" }}>
                                            {item.speakerTitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Expand chevron */}
                    {hasDetails && (
                        <motion.div
                            animate={{ rotate: expanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0 mt-1"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke={isPast ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.25)"}
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Expanded details */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 flex flex-col gap-4"
                            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
                            {item.description?.trim() && (
                                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                                    {item.description}
                                </p>
                            )}
                            {item.speakerBio?.trim() && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                                        style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
                                        About the speaker
                                    </p>
                                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                                        {item.speakerBio}
                                    </p>
                                </div>
                            )}
                            {isPast && !item.isBreak && guestId && (
                                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
                                    <StarRating agendaItemId={item.id} eventId={eventId} guestId={guestId} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PublicEventPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);

    const [event, setEvent] = useState<EventData | null>(null);
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [tab, setTab] = useState<"agenda" | "qa" | "polls">("agenda");
    const [now, setNow] = useState<Date>(new Date());

    // Q&A form
    const [name, setName] = useState("");
    const [anonymous, setAnonymous] = useState(false);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const guestId = useRef<string>("");

    useEffect(() => {
        guestId.current = getGuestId();
        // Tick the clock every minute so Live/Past indicators update
        const t = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(t);
    }, []);

    // Load event + subscribe for currentAgendaItem changes
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "events", eventId), (snap) => {
            if (snap.exists()) setEvent(snap.data() as EventData);
        });
        return () => unsub();
    }, [eventId]);

    // Load agenda
    useEffect(() => {
        getDocs(
            query(collection(db, "agendas"), where("eventId", "==", eventId))
        ).then((snap) => {
            const items: AgendaItem[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<AgendaItem, "id">),
            }));
            items.sort((a, b) => {
                if (a.date !== b.date) return (a.date ?? "").localeCompare(b.date ?? "");
                return timeToMinutes(a.startTime) - timeToMinutes(b.startTime) || a.order - b.order;
            });
            setAgenda(items);
        });
    }, [eventId]);

    // Real-time active polls
    useEffect(() => {
        const q = query(
            collection(db, "polls"),
            where("eventId", "==", eventId),
            where("isActive", "==", true)
        );
        const unsub = onSnapshot(q, (snap) => {
            const ps: Poll[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Poll));
            ps.sort((a, b) => a.createdAt - b.createdAt);
            setPolls(ps);
        });
        return () => unsub();
    }, [eventId]);

    // Real-time approved questions
    useEffect(() => {
        const q = query(
            collection(db, "questions"),
            where("eventId", "==", eventId),
            where("status", "in", ["approved", "answered"])
        );
        const unsub = onSnapshot(q, (snap) => {
            const qs: Question[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<Question, "id">),
            }));
            qs.sort((a, b) =>
                (b.upvotes?.length ?? 0) - (a.upvotes?.length ?? 0) || a.createdAt - b.createdAt
            );
            setQuestions(qs);
        });
        return () => unsub();
    }, [eventId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!text.trim()) return;
        if (!anonymous && !name.trim()) {
            setSubmitError("Please enter your name or submit anonymously.");
            return;
        }
        setSubmitError("");
        setSubmitting(true);
        try {
            await addDoc(collection(db, "questions"), {
                eventId,
                text: text.trim(),
                authorName: anonymous ? "Anonymous" : name.trim(),
                isAnonymous: anonymous,
                status: "pending",
                upvotes: [],
                createdAt: Date.now(),
            });
            setText("");
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 5000);
        } catch {
            setSubmitError("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUpvote(questionId: string) {
        const id = guestId.current;
        const q = questions.find((q) => q.id === questionId);
        if (!q || q.upvotes?.includes(id)) return;
        try {
            await updateDoc(doc(db, "questions", questionId), {
                upvotes: arrayUnion(id),
            });
        } catch { /* silent */ }
    }

    const accent = "#e85c29";
    const todayStr = toISODate(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const days = groupByDate(agenda);

    // Manual override takes priority; fall back to time-based detection
    const manualLiveId = event?.currentAgendaItem ?? null;
    const liveSession = manualLiveId
        ? agenda.find((item) => item.id === manualLiveId) ?? null
        : agenda.find((item) => !item.isBreak && getSessionStatus(item, todayStr, nowMinutes) === "live") ?? null;
    const nextSession = agenda.find(
        (item) => !item.isBreak && item.date === todayStr &&
            timeToMinutes(item.startTime) > nowMinutes
    );

    return (
        <div className="min-h-screen" style={{ background: "#0f1117", fontFamily: "var(--font-rubik), sans-serif" }}>

            {/* ── Header ── */}
            <header className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
                style={{ background: "rgba(15,17,23,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
                    <span className="text-white font-semibold text-sm tracking-wide">NexVenue</span>
                </div>
                {event && (
                    <span className="text-xs font-medium truncate max-w-[180px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {event.title}
                    </span>
                )}
            </header>

            {/* ── Event Hero ── */}
            {event ? (
                <div className="px-5 pt-6 pb-2">
                    {event.imageUrl && (
                        <div className="w-full rounded-2xl overflow-hidden mb-5" style={{ aspectRatio: "16/7" }}>
                            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Live now / Up next strip */}
                    {(liveSession || nextSession) && (
                        <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
                            style={{
                                background: liveSession ? "rgba(232,92,41,0.1)" : "rgba(255,255,255,0.04)",
                                border: liveSession ? "1px solid rgba(232,92,41,0.25)" : "1px solid rgba(255,255,255,0.07)",
                            }}>
                            {liveSession ? (
                                <>
                                    <motion.div
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ background: accent }}
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase" style={{ color: accent, letterSpacing: "0.06em" }}>Happening now</p>
                                        <p className="text-sm font-semibold text-white truncate">{liveSession.title}</p>
                                        {liveSession.speaker && (
                                            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{liveSession.speaker}</p>
                                        )}
                                    </div>
                                </>
                            ) : nextSession ? (
                                <>
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.2)" }} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>Up next · {nextSession.startTime}</p>
                                        <p className="text-sm font-semibold text-white truncate">{nextSession.title}</p>
                                        {nextSession.speaker && (
                                            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{nextSession.speaker}</p>
                                        )}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}

                    <h1 className="text-white font-black mb-3" style={{ fontSize: "clamp(1.4rem, 5vw, 2rem)", lineHeight: 1.2 }}>
                        {event.title}
                    </h1>
                    <div className="flex flex-col gap-1.5 mb-3">
                        <div className="flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                                {formatEventDate(event.date)}{event.time ? ` · ${event.time}` : ""}
                            </span>
                        </div>
                        {event.location && (
                            <div className="flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                </svg>
                                <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{event.location}</span>
                            </div>
                        )}
                    </div>
                    {event.description && (
                        <p className="text-sm leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {event.description}
                        </p>
                    )}
                </div>
            ) : (
                <div className="px-5 pt-8 pb-4">
                    <div className="h-7 rounded-lg w-3/4 mb-3 animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <div className="h-4 rounded w-1/2 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="px-5 flex gap-1 mt-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {(["agenda", "qa", "polls"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className="relative px-4 py-3 text-sm font-semibold transition-colors"
                        style={{ color: tab === t ? "white" : "rgba(255,255,255,0.35)" }}
                    >
                        {t === "agenda" ? "Agenda" : t === "qa" ? "Q&A" : (
                            <span className="flex items-center gap-1.5">
                                Polls
                                {polls.length > 0 && (
                                    <span className="text-xs font-black w-4 h-4 rounded-full flex items-center justify-center"
                                        style={{ background: accent, color: "white", fontSize: 10 }}>
                                        {polls.length}
                                    </span>
                                )}
                            </span>
                        )}
                        {tab === t && (
                            <motion.div
                                layoutId="tab-indicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                                style={{ background: accent }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ── */}
            <AnimatePresence mode="wait">
                {tab === "agenda" ? (
                    <motion.div
                        key="agenda"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="px-5 py-5"
                    >
                        {days.length === 0 ? (
                            <p className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                                No agenda items yet
                            </p>
                        ) : (
                            <div className="flex flex-col gap-8">
                                {days.map(([date, items]) => {
                                    const { weekday, dateLabel } = formatDayHeading(date);
                                    const isToday = date === todayStr;
                                    const isPastDay = date < todayStr;

                                    return (
                                        <div key={date}>
                                            {/* Day heading */}
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="flex items-baseline gap-2">
                                                    <h2 className="font-black text-lg"
                                                        style={{ color: isPastDay ? "rgba(255,255,255,0.3)" : "white" }}>
                                                        {weekday}
                                                    </h2>
                                                    <span className="text-sm"
                                                        style={{ color: isPastDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.35)" }}>
                                                        {dateLabel}
                                                    </span>
                                                </div>
                                                {isToday && (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                        style={{ background: "rgba(232,92,41,0.15)", color: accent }}>
                                                        Today
                                                    </span>
                                                )}
                                                {isPastDay && (
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                                                        style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)" }}>
                                                        Completed
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {items.map((item) => (
                                                    <AgendaCard
                                                        key={item.id}
                                                        item={item}
                                                        status={manualLiveId ? (item.id === manualLiveId ? "live" : getSessionStatus(item, todayStr, nowMinutes)) : getSessionStatus(item, todayStr, nowMinutes)}
                                                        eventId={eventId}
                                                        guestId={guestId.current}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="qa"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="px-5 py-5 flex flex-col gap-5"
                    >
                        {/* Context note */}
                        <div className="rounded-xl px-4 py-3 flex items-start gap-3"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                                Submit your question below. A moderator will review and approve it before it appears on screen. Speakers address questions during dedicated Q&A segments.
                            </p>
                        </div>

                        {/* Submit form */}
                        <div className="rounded-2xl p-5"
                            style={{ background: "rgba(232,92,41,0.06)", border: "1px solid rgba(232,92,41,0.15)" }}>
                            <h2 className="text-white font-bold text-base mb-4">Ask a question</h2>

                            <AnimatePresence mode="wait">
                                {submitted ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center py-4 gap-2"
                                    >
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                                            style={{ background: "rgba(16,185,129,0.15)" }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                        <p className="text-white font-semibold text-sm">Question submitted</p>
                                        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                                            A moderator will review it shortly
                                        </p>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onSubmit={handleSubmit}
                                        className="flex flex-col gap-3"
                                    >
                                        {!anonymous && (
                                            <input
                                                type="text"
                                                placeholder="Your name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                                                onFocus={(e) => (e.target.style.borderColor = "rgba(232,92,41,0.5)")}
                                                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                                            />
                                        )}
                                        <textarea
                                            placeholder="Type your question..."
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none transition-all"
                                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                                            onFocus={(e) => (e.target.style.borderColor = "rgba(232,92,41,0.5)")}
                                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                                        />
                                        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                                            <div
                                                onClick={() => setAnonymous(!anonymous)}
                                                className="w-9 h-5 rounded-full relative transition-colors"
                                                style={{ background: anonymous ? accent : "rgba(255,255,255,0.12)" }}
                                            >
                                                <div
                                                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                                                    style={{ transform: anonymous ? "translateX(17px)" : "translateX(2px)" }}
                                                />
                                            </div>
                                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Submit anonymously</span>
                                        </label>
                                        {submitError && (
                                            <p className="text-xs" style={{ color: "#f87171" }}>{submitError}</p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={submitting || !text.trim()}
                                            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
                                            style={{ background: accent, opacity: submitting || !text.trim() ? 0.5 : 1 }}
                                        >
                                            {submitting ? "Submitting..." : "Submit question"}
                                        </button>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Approved questions */}
                        {questions.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                                    style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
                                    Live questions · {questions.length}
                                </p>
                                <div className="flex flex-col gap-2.5">
                                    <AnimatePresence initial={false}>
                                        {questions.map((q) => {
                                            const hasUpvoted = q.upvotes?.includes(guestId.current);
                                            return (
                                                <motion.div
                                                    key={q.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                                    className="rounded-xl p-4 flex items-start gap-3"
                                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-sm leading-snug mb-2">{q.text}</p>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                                                {q.isAnonymous ? "Anonymous" : q.authorName}
                                                            </span>
                                                            {q.status === "answered" && (
                                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                                    style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                                                                    Answered
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUpvote(q.id)}
                                                        disabled={hasUpvoted}
                                                        className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5"
                                                        style={{ color: hasUpvoted ? accent : "rgba(255,255,255,0.25)", opacity: hasUpvoted ? 1 : 0.6 }}
                                                    >
                                                        <UpvoteIcon filled={hasUpvoted} />
                                                        {(q.upvotes?.length ?? 0) > 0 && (
                                                            <span className="text-xs font-bold tabular-nums">{q.upvotes.length}</span>
                                                        )}
                                                    </button>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {questions.length === 0 && !submitted && (
                            <p className="text-center py-4 text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                                No questions approved yet
                            </p>
                        )}
                    </motion.div>
                )}

                {/* ── Polls tab ── */}
                {tab === "polls" && (
                    <motion.div
                        key="polls"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="px-5 py-5 flex flex-col gap-5"
                    >
                        {polls.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(232,92,41,0.08)", border: "1px solid rgba(232,92,41,0.15)" }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e85c29" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="3" width="6" height="18" rx="1" /><rect x="9" y="8" width="6" height="13" rx="1" /><rect x="16" y="13" width="6" height="8" rx="1" />
                                    </svg>
                                </div>
                                <p className="text-white font-semibold">No active polls yet</p>
                                <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                                    Polls will appear here when the organiser launches one
                                </p>
                            </div>
                        ) : (
                            polls.map((poll) => {
                                const gid = guestId.current;
                                const totalVotes = poll.options.reduce((s, o) => s + (o.votes?.length ?? 0), 0);
                                const myVoteId = poll.options.find((o) => o.votes?.includes(gid))?.id ?? null;

                                async function vote(optionId: string) {
                                    if (myVoteId) return; // already voted
                                    const updated = poll.options.map((o) =>
                                        o.id === optionId
                                            ? { ...o, votes: [...(o.votes ?? []), gid] }
                                            : o
                                    );
                                    try {
                                        await updateDoc(doc(db, "polls", poll.id), { options: updated });
                                    } catch { /* silent */ }
                                }

                                return (
                                    <div key={poll.id} className="rounded-2xl p-5"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                        <p className="text-white font-semibold text-base leading-snug mb-4">{poll.question}</p>
                                        <div className="flex flex-col gap-2">
                                            {poll.options.map((opt) => {
                                                const isMyVote = opt.id === myVoteId;
                                                const pct = totalVotes > 0 ? Math.round((opt.votes?.length ?? 0) / totalVotes * 100) : 0;
                                                const showBar = poll.showResults || !!myVoteId;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => vote(opt.id)}
                                                        disabled={!!myVoteId}
                                                        className="w-full text-left rounded-xl px-4 py-3 relative overflow-hidden transition-all"
                                                        style={{
                                                            background: isMyVote ? "rgba(232,92,41,0.15)" : "rgba(255,255,255,0.04)",
                                                            border: isMyVote ? "1px solid rgba(232,92,41,0.4)" : "1px solid rgba(255,255,255,0.08)",
                                                        }}
                                                    >
                                                        {showBar && (
                                                            <div className="absolute inset-0 rounded-xl"
                                                                style={{
                                                                    background: isMyVote ? "rgba(232,92,41,0.12)" : "rgba(255,255,255,0.03)",
                                                                    width: `${pct}%`,
                                                                    transition: "width 0.4s ease",
                                                                }} />
                                                        )}
                                                        <div className="relative flex items-center justify-between gap-3">
                                                            <span className="text-sm font-medium" style={{ color: isMyVote ? "#e85c29" : "rgba(255,255,255,0.8)" }}>
                                                                {opt.text}
                                                            </span>
                                                            {showBar && (
                                                                <span className="text-xs font-bold tabular-nums shrink-0"
                                                                    style={{ color: isMyVote ? "#e85c29" : "rgba(255,255,255,0.35)" }}>
                                                                    {pct}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {myVoteId && (
                                            <p className="text-xs mt-3 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                                                {totalVotes} vote{totalVotes !== 1 ? "s" : ""} · Your response recorded
                                            </p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="px-5 py-6 text-center">
                <span className="text-xs font-semibold tracking-widest" style={{ color: "rgba(255,255,255,0.08)", letterSpacing: "0.15em" }}>
                    NEXVENUE
                </span>
            </div>
        </div>
    );
}
