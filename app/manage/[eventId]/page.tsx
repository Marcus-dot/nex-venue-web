"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    updateDoc,
    where,
    getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { agendaService } from "@/services/agenda";
import { AnimatePresence, motion } from "framer-motion";
import { AgendaItem } from "@/types/agenda";
import { Event } from "@/types/events";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Question {
    id: string;
    text: string;
    authorName: string;
    isAnonymous: boolean;
    status: "pending" | "approved" | "answered" | "rejected";
    upvotes: string[];
    createdAt: number;
    approvedAt?: number;
    answeredAt?: number;
}

interface RatingSummary {
    agendaItemId: string;
    title: string;
    avg: number;
    count: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeToMin(t: string): number {
    const [h, m] = (t || "0:0").split(":").map(Number);
    return h * 60 + m;
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Question["status"] }) {
    const map = {
        pending:  { label: "Pending",  bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
        approved: { label: "Approved", bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
        answered: { label: "Answered", bg: "rgba(59,130,246,0.12)",  color: "#3b82f6" },
        rejected: { label: "Rejected", bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
    };
    const s = map[status];
    return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: s.bg, color: s.color }}>
            {s.label}
        </span>
    );
}

// ─── Star display ────────────────────────────────────────────────────────────

function Stars({ score, max = 5 }: { score: number; max?: number }) {
    const accent = "#e85c29";
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: max }).map((_, i) => (
                <svg key={i} width="14" height="14" viewBox="0 0 24 24"
                    fill={i < Math.round(score) ? accent : "none"}
                    stroke={i < Math.round(score) ? accent : "rgba(255,255,255,0.15)"}
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            ))}
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ManageEventPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const { user, profile, isAdmin } = useAuth();
    const router = useRouter();

    const [event, setEvent] = useState<Event | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [authorized, setAuthorized] = useState(false);
    const [tab, setTab] = useState<"qa" | "agenda" | "ratings">("qa");

    // Q&A state
    const [questions, setQuestions] = useState<Question[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Agenda state
    const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
    const [liveItemId, setLiveItemId] = useState<string | null>(null);
    const [liveLoading, setLiveLoading] = useState<string | null>(null);

    // Ratings state
    const [ratings, setRatings] = useState<RatingSummary[]>([]);
    const [ratingsLoaded, setRatingsLoaded] = useState(false);

    const accent = "#e85c29";

    // ── Auth + access check ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return; // still loading
        getDoc(doc(db, "events", eventId)).then((snap) => {
            if (!snap.exists()) { router.replace("/events"); return; }
            const ev = { id: snap.id, ...snap.data() } as Event;
            setEvent(ev);
            const canAccess = isAdmin ||
                ev.organisers?.includes(user.uid) ||
                ev.creatorId === user.uid;
            setAuthorized(canAccess);
            setLiveItemId(ev.currentAgendaItem ?? null);
            setAuthChecked(true);
            if (!canAccess) return;
        });
    }, [user, isAdmin, eventId, router]);

    // Redirect if not logged in after auth resolves
    useEffect(() => {
        if (authChecked && !user) {
            router.replace(`/login?redirect=/manage/${eventId}`);
        }
    }, [authChecked, user, eventId, router]);

    // ── Q&A real-time ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!authorized) return;
        const q = query(collection(db, "questions"), where("eventId", "==", eventId));
        const unsub = onSnapshot(q, (snap) => {
            const qs: Question[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
            qs.sort((a, b) => b.createdAt - a.createdAt);
            setQuestions(qs);
        });
        return () => unsub();
    }, [authorized, eventId]);

    // ── Agenda real-time ────────────────────────────────────────────────────
    useEffect(() => {
        if (!authorized) return;
        const unsub = agendaService.subscribeToAgenda(eventId, (items) => {
            setAgendaItems([...items].sort((a, b) => {
                if (a.date !== b.date) return (a.date ?? "").localeCompare(b.date ?? "");
                return timeToMin(a.startTime) - timeToMin(b.startTime);
            }));
        });
        // Also subscribe to live item changes on the event doc
        const eventUnsub = onSnapshot(doc(db, "events", eventId), (snap) => {
            if (snap.exists()) setLiveItemId(snap.data().currentAgendaItem ?? null);
        });
        return () => { unsub(); eventUnsub(); };
    }, [authorized, eventId]);

    // ── Ratings load (on tab switch) ────────────────────────────────────────
    useEffect(() => {
        if (tab !== "ratings" || !authorized || ratingsLoaded) return;
        (async () => {
            const [agSnap, rSnap] = await Promise.all([
                getDocs(query(collection(db, "agendas"), where("eventId", "==", eventId))),
                getDocs(query(collection(db, "ratings"), where("eventId", "==", eventId))),
            ]);
            const items = agSnap.docs.map(d => ({ id: d.id, ...d.data() } as AgendaItem))
                .filter(i => !i.isBreak)
                .sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));

            const byItem: Record<string, number[]> = {};
            rSnap.docs.forEach(d => {
                const { agendaItemId, score } = d.data();
                if (!byItem[agendaItemId]) byItem[agendaItemId] = [];
                byItem[agendaItemId].push(score);
            });

            const summaries: RatingSummary[] = items
                .map(i => {
                    const scores = byItem[i.id] ?? [];
                    const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
                    return { agendaItemId: i.id, title: i.title, avg, count: scores.length };
                })
                .filter(s => s.count > 0)
                .sort((a, b) => b.avg - a.avg);

            setRatings(summaries);
            setRatingsLoaded(true);
        })();
    }, [tab, authorized, eventId, ratingsLoaded]);

    // ── Q&A actions ─────────────────────────────────────────────────────────

    function setLoading(id: string, v: boolean) {
        setActionLoading(prev => ({ ...prev, [id]: v }));
    }

    async function handleApprove(q: Question) {
        setLoading(q.id, true);
        const text = editingId === q.id ? editText.trim() : q.text;
        await updateDoc(doc(db, "questions", q.id), {
            status: "approved",
            text,
            approvedAt: Date.now(),
        });
        setEditingId(null);
        setLoading(q.id, false);
    }

    async function handleReject(id: string) {
        setLoading(id, true);
        await updateDoc(doc(db, "questions", id), { status: "rejected" });
        setLoading(id, false);
    }

    async function handleAnswered(id: string) {
        setLoading(id, true);
        await updateDoc(doc(db, "questions", id), { status: "answered", answeredAt: Date.now() });
        setLoading(id, false);
    }

    async function handleSaveEdit(q: Question) {
        if (!editText.trim()) return;
        setLoading(q.id, true);
        await updateDoc(doc(db, "questions", q.id), { text: editText.trim() });
        setEditingId(null);
        setLoading(q.id, false);
    }

    // ── Agenda actions ───────────────────────────────────────────────────────

    async function handleSetLive(itemId: string) {
        const next = liveItemId === itemId ? null : itemId;
        setLiveLoading(itemId);
        try {
            await agendaService.setCurrentAgendaItem(eventId, next);
        } finally {
            setLiveLoading(null);
        }
    }

    // ── Loading / access guards ──────────────────────────────────────────────

    if (!authChecked || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f1117" }}>
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${accent} transparent transparent transparent` }} />
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#0f1117" }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                </div>
                <p className="text-white font-semibold">Access denied</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>You are not an organiser for this event.</p>
            </div>
        );
    }

    const pending  = questions.filter(q => q.status === "pending");
    const approved = questions.filter(q => q.status === "approved");
    const answered = questions.filter(q => q.status === "answered");
    const rejected = questions.filter(q => q.status === "rejected");

    const TABS = [
        { id: "qa",      label: `Q&A`, badge: pending.length || undefined },
        { id: "agenda",  label: "Live Agenda" },
        { id: "ratings", label: "Ratings" },
    ] as const;

    return (
        <div className="min-h-screen pb-16" style={{ background: "#0f1117", fontFamily: "var(--font-rubik), sans-serif" }}>

            {/* ── Header ── */}
            <div className="px-5 pt-8 pb-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent, letterSpacing: "0.1em" }}>
                        Admin
                    </span>
                </div>
                <h1 className="text-white font-black text-2xl">{event?.title ?? "Event"}</h1>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {profile?.fullName} · {isAdmin ? "Platform Admin" : "Organiser"}
                </p>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 px-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className="relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold transition-colors"
                        style={{ color: tab === t.id ? "white" : "rgba(255,255,255,0.35)" }}>
                        {t.label}
                        {"badge" in t && t.badge ? (
                            <span className="text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background: accent, color: "white" }}>
                                {t.badge}
                            </span>
                        ) : null}
                        {tab === t.id && (
                            <motion.div layoutId="admin-tab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                                style={{ background: accent }} />
                        )}
                    </button>
                ))}
            </div>

            {/* ══ Q&A TAB ══════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                {tab === "qa" && (
                    <motion.div key="qa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }} className="px-5 py-6 flex flex-col gap-8">

                        {/* Pending */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-white font-bold text-base">Pending</h2>
                                {pending.length > 0 && (
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>
                                        {pending.length}
                                    </span>
                                )}
                            </div>

                            {pending.length === 0 ? (
                                <p className="text-sm py-6 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                                    No pending questions
                                </p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {pending.map(q => (
                                        <div key={q.id} className="rounded-2xl p-4"
                                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                                                        {q.isAnonymous ? "Anonymous" : q.authorName} · {formatTime(q.createdAt)}
                                                    </p>
                                                    {editingId === q.id ? (
                                                        <textarea
                                                            value={editText}
                                                            onChange={e => setEditText(e.target.value)}
                                                            rows={3}
                                                            autoFocus
                                                            className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
                                                            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${accent}` }}
                                                        />
                                                    ) : (
                                                        <p className="text-white text-sm leading-snug">{q.text}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {editingId === q.id ? (
                                                    <>
                                                        <button onClick={() => handleSaveEdit(q)}
                                                            disabled={actionLoading[q.id]}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                                                            style={{ background: "rgba(255,255,255,0.1)" }}>
                                                            Save
                                                        </button>
                                                        <button onClick={() => setEditingId(null)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                            style={{ color: "rgba(255,255,255,0.4)" }}>
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => { setEditingId(q.id); setEditText(q.text); }}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                                                        Edit
                                                    </button>
                                                )}
                                                <button onClick={() => handleApprove(q)}
                                                    disabled={actionLoading[q.id]}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                                    style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>
                                                    {actionLoading[q.id] ? "..." : "Approve"}
                                                </button>
                                                <button onClick={() => handleReject(q.id)}
                                                    disabled={actionLoading[q.id]}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                                                    style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Approved */}
                        {approved.length > 0 && (
                            <section>
                                <h2 className="text-white font-bold text-base mb-4">Approved — on screen</h2>
                                <div className="flex flex-col gap-3">
                                    {approved.map(q => (
                                        <div key={q.id} className="rounded-2xl p-4 flex items-start gap-3"
                                            style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)" }}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                                                    {q.isAnonymous ? "Anonymous" : q.authorName}
                                                </p>
                                                <p className="text-white text-sm leading-snug">{q.text}</p>
                                            </div>
                                            <button onClick={() => handleAnswered(q.id)}
                                                disabled={actionLoading[q.id]}
                                                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
                                                style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                                                {actionLoading[q.id] ? "..." : "Mark answered"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Answered */}
                        {answered.length > 0 && (
                            <section>
                                <h2 className="font-bold text-base mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Answered</h2>
                                <div className="flex flex-col gap-2">
                                    {answered.map(q => (
                                        <div key={q.id} className="rounded-xl px-4 py-3 flex items-start gap-3"
                                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                            <p className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.4)" }}>{q.text}</p>
                                            <StatusBadge status="answered" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Rejected */}
                        {rejected.length > 0 && (
                            <section>
                                <h2 className="font-bold text-base mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>Rejected</h2>
                                <div className="flex flex-col gap-2">
                                    {rejected.map(q => (
                                        <div key={q.id} className="rounded-xl px-4 py-3 flex items-start gap-3"
                                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                            <p className="text-sm flex-1 line-through" style={{ color: "rgba(255,255,255,0.25)" }}>{q.text}</p>
                                            <button onClick={() => handleApprove(q)}
                                                className="shrink-0 text-xs px-2 py-1 rounded-lg"
                                                style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)" }}>
                                                Restore
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </motion.div>
                )}

                {/* ══ AGENDA TAB ═══════════════════════════════════════════════ */}
                {tab === "agenda" && (
                    <motion.div key="agenda" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }} className="px-5 py-6">

                        <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            Tap a session to set it as live. This updates the projection screen and the public event page instantly.
                        </p>

                        {liveItemId && (
                            <div className="rounded-xl px-4 py-3 mb-5 flex items-center justify-between"
                                style={{ background: "rgba(232,92,41,0.08)", border: "1px solid rgba(232,92,41,0.2)" }}>
                                <div className="flex items-center gap-2">
                                    <motion.div className="w-2 h-2 rounded-full" style={{ background: accent }}
                                        animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} />
                                    <span className="text-sm font-semibold text-white">
                                        {agendaItems.find(i => i.id === liveItemId)?.title ?? "Session live"}
                                    </span>
                                </div>
                                <button onClick={() => handleSetLive(liveItemId)}
                                    className="text-xs font-semibold px-3 py-1 rounded-lg"
                                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
                                    Clear
                                </button>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            {agendaItems.filter(i => !i.isBreak).map(item => {
                                const isLive = liveItemId === item.id;
                                const loading = liveLoading === item.id;
                                return (
                                    <button key={item.id} onClick={() => handleSetLive(item.id)}
                                        disabled={loading}
                                        className="w-full text-left rounded-xl p-4 transition-all"
                                        style={{
                                            background: isLive ? "rgba(232,92,41,0.1)" : "rgba(255,255,255,0.03)",
                                            border: isLive ? `1px solid rgba(232,92,41,0.3)` : "1px solid rgba(255,255,255,0.06)",
                                        }}>
                                        <div className="flex items-center gap-3">
                                            <div className="shrink-0 text-center w-14">
                                                <span className="text-xs font-bold tabular-nums block"
                                                    style={{ color: isLive ? accent : "rgba(255,255,255,0.4)" }}>
                                                    {item.startTime}
                                                </span>
                                                <span className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>
                                                    {item.date?.slice(5)}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate" style={{ color: isLive ? "white" : "rgba(255,255,255,0.7)" }}>
                                                    {item.title}
                                                </p>
                                                {item.speaker && (
                                                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{item.speaker}</p>
                                                )}
                                            </div>
                                            <div className="shrink-0">
                                                {loading ? (
                                                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                                                        style={{ borderColor: `${accent} transparent transparent transparent` }} />
                                                ) : isLive ? (
                                                    <motion.div className="w-2.5 h-2.5 rounded-full" style={{ background: accent }}
                                                        animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} />
                                                ) : (
                                                    <div className="w-2.5 h-2.5 rounded-full"
                                                        style={{ border: "1.5px solid rgba(255,255,255,0.12)" }} />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* ══ RATINGS TAB ══════════════════════════════════════════════ */}
                {tab === "ratings" && (
                    <motion.div key="ratings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }} className="px-5 py-6">

                        {!ratingsLoaded ? (
                            <div className="flex justify-center py-12">
                                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                                    style={{ borderColor: `${accent} transparent transparent transparent` }} />
                            </div>
                        ) : ratings.length === 0 ? (
                            <p className="text-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
                                No ratings yet — they appear here as attendees rate sessions
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {ratings.map((r, i) => (
                                    <div key={r.agendaItemId} className="rounded-xl p-4 flex items-center gap-4"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                        <span className="text-2xl font-black w-6 text-center shrink-0"
                                            style={{ color: i === 0 ? accent : "rgba(255,255,255,0.2)" }}>
                                            {i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate mb-1">{r.title}</p>
                                            <Stars score={r.avg} />
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-lg font-black" style={{ color: accent }}>
                                                {r.avg.toFixed(1)}
                                            </p>
                                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                                {r.count} {r.count === 1 ? "rating" : "ratings"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
