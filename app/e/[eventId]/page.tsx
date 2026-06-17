"use client";

import { use, useEffect, useRef, useState } from "react";
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    doc,
    getDoc,
    getDocs,
    arrayUnion,
    updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { AnimatePresence, motion } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────

interface EventData {
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    imageUrl?: string;
}

interface AgendaItem {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    speaker?: string;
    speakerImages?: string[];
    category?: string;
    isBreak?: boolean;
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

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function UpvoteIcon({ filled }: { filled: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.5}>
            <path d="M8 2L14 9H10V14H6V9H2L8 2Z" />
        </svg>
    );
}

function CategoryBadge({ category }: { category?: string }) {
    if (!category || category === "other") return null;
    const labels: Record<string, string> = {
        keynote: "Keynote",
        panel: "Panel",
        workshop: "Workshop",
        presentation: "Presentation",
        networking: "Networking",
        fireside: "Fireside",
        demo: "Demo",
        case_study: "Case Study",
        remarks: "Remarks",
        break: "Break",
    };
    return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(232,92,41,0.12)", color: "#e85c29" }}>
            {labels[category] ?? category}
        </span>
    );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PublicEventPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);

    const [event, setEvent] = useState<EventData | null>(null);
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [tab, setTab] = useState<"agenda" | "qa">("agenda");

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
    }, []);

    // Load event
    useEffect(() => {
        getDoc(doc(db, "events", eventId)).then((snap) => {
            if (snap.exists()) setEvent(snap.data() as EventData);
        });
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
                const toMin = (t: string) => {
                    const [h, m] = t.split(":").map(Number);
                    return (h || 0) * 60 + (m || 0);
                };
                return toMin(a.startTime) - toMin(b.startTime) || a.order - b.order;
            });
            setAgenda(items);
        });
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

    // Submit question
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
            setTimeout(() => setSubmitted(false), 4000);
        } catch {
            setSubmitError("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    // Upvote question
    async function handleUpvote(questionId: string) {
        const id = guestId.current;
        const q = questions.find((q) => q.id === questionId);
        if (!q || q.upvotes?.includes(id)) return;
        try {
            await updateDoc(doc(db, "questions", questionId), {
                upvotes: arrayUnion(id),
            });
        } catch {
            // silent
        }
    }

    const accent = "#e85c29";

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
                <div className="px-5 pt-6 pb-5">
                    {event.imageUrl && (
                        <div className="w-full rounded-2xl overflow-hidden mb-5" style={{ aspectRatio: "16/7" }}>
                            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <h1 className="text-white font-black mb-3" style={{ fontSize: "clamp(1.4rem, 5vw, 2rem)", lineHeight: 1.2 }}>
                        {event.title}
                    </h1>
                    <div className="flex flex-col gap-1.5 mb-4">
                        <div className="flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                                {formatDate(event.date)}{event.time ? ` · ${event.time}` : ""}
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
                </div>
            ) : (
                <div className="px-5 pt-8 pb-5">
                    <div className="h-7 rounded-lg w-3/4 mb-3 animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <div className="h-4 rounded w-1/2 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="px-5 flex gap-1 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {(["agenda", "qa"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className="relative px-4 py-3 text-sm font-semibold transition-colors"
                        style={{ color: tab === t ? "white" : "rgba(255,255,255,0.35)" }}
                    >
                        {t === "agenda" ? "Agenda" : "Q&A"}
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
                        {agenda.length === 0 ? (
                            <p className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                                No agenda items yet
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {agenda.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-xl p-4"
                                        style={{
                                            background: item.isBreak
                                                ? "rgba(255,255,255,0.02)"
                                                : "rgba(255,255,255,0.04)",
                                            border: `1px solid ${item.isBreak ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)"}`,
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Time */}
                                            <div className="shrink-0 pt-0.5 w-[52px]">
                                                <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>
                                                    {item.startTime}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <CategoryBadge category={item.category} />
                                                </div>
                                                <p className="font-semibold text-sm leading-snug"
                                                    style={{ color: item.isBreak ? "rgba(255,255,255,0.4)" : "white" }}>
                                                    {item.title}
                                                </p>
                                                {item.speaker && !item.isBreak && (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {item.speakerImages?.[0] && (
                                                            <img
                                                                src={item.speakerImages[0]}
                                                                alt={item.speaker}
                                                                className="w-6 h-6 rounded-full object-cover shrink-0"
                                                                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                                                            />
                                                        )}
                                                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                                                            {item.speaker}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* End time */}
                                            <span className="text-xs tabular-nums shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                                                {item.endTime}
                                            </span>
                                        </div>
                                    </div>
                                ))}
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
                        className="px-5 py-5 flex flex-col gap-6"
                    >
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
                                            It will appear once a moderator approves it
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
                                        {/* Name */}
                                        {!anonymous && (
                                            <input
                                                type="text"
                                                placeholder="Your name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                                                style={{
                                                    background: "rgba(255,255,255,0.05)",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                }}
                                                onFocus={(e) => (e.target.style.borderColor = "rgba(232,92,41,0.5)")}
                                                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                                            />
                                        )}

                                        {/* Question text */}
                                        <textarea
                                            placeholder="Type your question..."
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none transition-all"
                                            style={{
                                                background: "rgba(255,255,255,0.05)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                            }}
                                            onFocus={(e) => (e.target.style.borderColor = "rgba(232,92,41,0.5)")}
                                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                                        />

                                        {/* Anonymous toggle */}
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
                                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                                                Submit anonymously
                                            </span>
                                        </label>

                                        {submitError && (
                                            <p className="text-xs" style={{ color: "#f87171" }}>{submitError}</p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={submitting || !text.trim()}
                                            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
                                            style={{
                                                background: accent,
                                                opacity: submitting || !text.trim() ? 0.5 : 1,
                                            }}
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
                                                    style={{
                                                        background: "rgba(255,255,255,0.03)",
                                                        border: "1px solid rgba(255,255,255,0.06)",
                                                    }}
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

                                                    {/* Upvote */}
                                                    <button
                                                        onClick={() => handleUpvote(q.id)}
                                                        disabled={hasUpvoted}
                                                        className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5 transition-opacity"
                                                        style={{
                                                            color: hasUpvoted ? accent : "rgba(255,255,255,0.25)",
                                                            opacity: hasUpvoted ? 1 : 0.6,
                                                        }}
                                                    >
                                                        <UpvoteIcon filled={hasUpvoted} />
                                                        {(q.upvotes?.length ?? 0) > 0 && (
                                                            <span className="text-xs font-bold tabular-nums">
                                                                {q.upvotes.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {questions.length === 0 && (
                            <p className="text-center py-6 text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
                                No questions approved yet — be the first
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Footer ── */}
            <div className="px-5 py-6 text-center">
                <span className="text-xs font-semibold tracking-widest" style={{ color: "rgba(255,255,255,0.1)", letterSpacing: "0.15em" }}>
                    NEXVENUE
                </span>
            </div>
        </div>
    );
}
