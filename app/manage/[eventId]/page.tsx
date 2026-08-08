"use client";

import { use, useEffect, useRef, useState } from "react";
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
import { agendaService } from "@/services/agenda";
import { Poll, pollService } from "@/services/polls";
import { motion } from "framer-motion";
import { AgendaItem } from "@/types/agenda";
import { Event } from "@/types/events";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Question {
    id: string;
    text: string;
    authorName: string;
    isAnonymous: boolean;
    directedTo?: string | null;
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
        pending:  { label: "Pending",  bg: "rgba(234,179,8,0.12)",  color: "#eab308" },
        approved: { label: "Approved", bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
        answered: { label: "Answered", bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
        rejected: { label: "Rejected", bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
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

function Stars({ score }: { score: number }) {
    const accent = "#e85c29";
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
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

    const [event, setEvent] = useState<Event | null>(null);
    const [tab, setTab] = useState<"qa" | "agenda" | "ratings" | "polls">("qa");

    // Q&A
    const [questions, setQuestions] = useState<Question[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Agenda
    const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
    const [liveItemId, setLiveItemId] = useState<string | null>(null);
    const [liveLoading, setLiveLoading] = useState<string | null>(null);

    // Ratings
    const [ratings, setRatings] = useState<RatingSummary[]>([]);
    const [ratingsLoaded, setRatingsLoaded] = useState(false);

    // Polls
    const [polls, setPolls] = useState<Poll[]>([]);
    const [pollLoading, setPollLoading] = useState<Record<string, boolean>>({});
    // Create form
    const [showCreatePoll, setShowCreatePoll] = useState(false);
    const [newQuestion, setNewQuestion] = useState("");
    const [newOptions, setNewOptions] = useState(["", ""]);
    const [creating, setCreating] = useState(false);
    // Edit form
    const [editingPollId, setEditingPollId] = useState<string | null>(null);
    const [editPollQuestion, setEditPollQuestion] = useState("");
    const [editPollOptions, setEditPollOptions] = useState<{ id: string; text: string; votes: string[] }[]>([]);
    const [savingPoll, setSavingPoll] = useState(false);
    // Delete confirm
    const [deletingPollId, setDeletingPollId] = useState<string | null>(null);

    const accent = "#e85c29";

    // ── Load event ──────────────────────────────────────────────────────────
    useEffect(() => {
        getDoc(doc(db, "events", eventId)).then((snap) => {
            if (snap.exists()) {
                setEvent({ id: snap.id, ...snap.data() } as Event);
                setLiveItemId(snap.data().currentAgendaItem ?? null);
            }
        });
    }, [eventId]);

    // ── Q&A real-time ───────────────────────────────────────────────────────
    useEffect(() => {
        const q = query(collection(db, "questions"), where("eventId", "==", eventId));
        const unsub = onSnapshot(q, (snap) => {
            const qs: Question[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
            qs.sort((a, b) => b.createdAt - a.createdAt);
            setQuestions(qs);
        });
        return () => unsub();
    }, [eventId]);

    // ── Agenda real-time ────────────────────────────────────────────────────
    useEffect(() => {
        const agendaUnsub = agendaService.subscribeToAgenda(eventId, (items) => {
            setAgendaItems([...items].sort((a, b) => {
                if (a.date !== b.date) return (a.date ?? "").localeCompare(b.date ?? "");
                return timeToMin(a.startTime) - timeToMin(b.startTime);
            }));
        });
        const eventUnsub = onSnapshot(doc(db, "events", eventId), (snap) => {
            if (snap.exists()) setLiveItemId(snap.data().currentAgendaItem ?? null);
        });
        return () => { agendaUnsub(); eventUnsub(); };
    }, [eventId]);

    // ── Ratings ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (tab !== "ratings" || ratingsLoaded) return;
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
    }, [tab, eventId, ratingsLoaded]);

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

    async function handleRestoreApprove(q: Question) {
        setLoading(q.id, true);
        await updateDoc(doc(db, "questions", q.id), { status: "approved", approvedAt: Date.now() });
        setLoading(q.id, false);
    }

    // ── Polls subscription ───────────────────────────────────────────────────

    useEffect(() => {
        const unsub = pollService.subscribeToEventPolls(eventId, setPolls);
        return unsub;
    }, [eventId]);

    // ── Poll actions ─────────────────────────────────────────────────────────

    function setPollLoading_(id: string, v: boolean) {
        setPollLoading(prev => ({ ...prev, [id]: v }));
    }

    async function handleCreatePoll() {
        const q = newQuestion.trim();
        const opts = newOptions.map(o => o.trim()).filter(Boolean);
        if (!q || opts.length < 2) return;
        setCreating(true);
        try {
            await pollService.createPoll(eventId, "organiser", q, opts);
            setNewQuestion("");
            setNewOptions(["", ""]);
            setShowCreatePoll(false);
        } finally {
            setCreating(false);
        }
    }

    async function handleToggleActive(poll: Poll) {
        setPollLoading_(poll.id, true);
        try { await pollService.toggleActive(poll.id, !poll.isActive); }
        finally { setPollLoading_(poll.id, false); }
    }

    async function handleToggleResults(poll: Poll) {
        setPollLoading_(poll.id + "_results", true);
        try { await pollService.toggleShowResults(poll.id, !poll.showResults); }
        finally { setPollLoading_(poll.id + "_results", false); }
    }

    function startEditPoll(poll: Poll) {
        setEditingPollId(poll.id);
        setEditPollQuestion(poll.question);
        setEditPollOptions(poll.options.map(o => ({ ...o })));
    }

    async function handleSavePoll() {
        if (!editingPollId) return;
        const q = editPollQuestion.trim();
        const opts = editPollOptions.filter(o => o.text.trim());
        if (!q || opts.length < 2) return;
        setSavingPoll(true);
        try {
            await pollService.updatePoll(editingPollId, q, opts.map(o => ({ ...o, text: o.text.trim() })));
            setEditingPollId(null);
        } finally {
            setSavingPoll(false);
        }
    }

    async function handleDeletePoll(pollId: string) {
        setPollLoading_(pollId + "_delete", true);
        try {
            await pollService.deletePoll(pollId);
            setDeletingPollId(null);
        } finally {
            setPollLoading_(pollId + "_delete", false);
        }
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

    // ── Render ───────────────────────────────────────────────────────────────

    const pending  = questions.filter(q => q.status === "pending");
    const approved = questions.filter(q => q.status === "approved");
    const answered = questions.filter(q => q.status === "answered");
    const rejected = questions.filter(q => q.status === "rejected");

    const TABS = [
        { id: "qa",      label: "Q&A",         badge: pending.length || undefined },
        { id: "agenda",  label: "Live Agenda",  badge: undefined },
        { id: "polls",   label: "Polls",        badge: polls.length || undefined },
        { id: "ratings", label: "Ratings",      badge: undefined },
    ] as const;

    return (
        <div className="min-h-screen pb-16" style={{ background: "#0f1117", fontFamily: "var(--font-rubik), sans-serif" }}>

            {/* ── Header ── */}
            <div className="px-5 pt-8 pb-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
                    <span className="text-xs font-semibold uppercase tracking-widest"
                        style={{ color: accent, letterSpacing: "0.1em" }}>Admin</span>
                </div>
                <h1 className="text-white font-black text-2xl">{event?.title ?? "Loading..."}</h1>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 px-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className="relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold transition-colors"
                        style={{ color: tab === t.id ? "white" : "rgba(255,255,255,0.35)" }}>
                        {t.label}
                        {t.badge ? (
                            <span className="text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background: accent, color: "white" }}>
                                {t.badge}
                            </span>
                        ) : null}
                        {tab === t.id && (
                            <motion.div layoutId="admin-tab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                                style={{ background: accent }} />
                        )}
                    </button>
                ))}
            </div>

                {/* ══ Q&A ═════════════════════════════════════════════════════ */}
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
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                                                    {q.isAnonymous ? "Anonymous" : q.authorName} · {formatTime(q.createdAt)}
                                                </span>
                                                {q.directedTo && (
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                        style={{ background: "rgba(232,92,41,0.15)", color: "#e85c29" }}>
                                                        → {q.directedTo}
                                                    </span>
                                                )}
                                            </div>

                                            {editingId === q.id ? (
                                                <textarea
                                                    value={editText}
                                                    onChange={e => setEditText(e.target.value)}
                                                    rows={3}
                                                    autoFocus
                                                    className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none resize-none mb-3"
                                                    style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${accent}` }}
                                                />
                                            ) : (
                                                <p className="text-white text-sm leading-snug mb-3">{q.text}</p>
                                            )}

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
                                                    <button onClick={() => { setEditingId(q.id); setEditText(q.text); }}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                                                        Edit
                                                    </button>
                                                )}
                                                <button onClick={() => handleApprove(q)}
                                                    disabled={actionLoading[q.id]}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                                                    style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
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
                                <h2 className="text-white font-bold text-base mb-4">Approved Â· on screen</h2>
                                <div className="flex flex-col gap-3">
                                    {approved.map(q => (
                                        <div key={q.id} className="rounded-2xl p-4 flex items-start gap-3"
                                            style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)" }}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                                                        {q.isAnonymous ? "Anonymous" : q.authorName}
                                                    </span>
                                                    {q.directedTo && (
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                            style={{ background: "rgba(232,92,41,0.15)", color: "#e85c29" }}>
                                                            → {q.directedTo}
                                                        </span>
                                                    )}
                                                </div>
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
                                <h2 className="font-bold text-base mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    Answered · {answered.length}
                                </h2>
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
                                <h2 className="font-bold text-base mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                                    Rejected · {rejected.length}
                                </h2>
                                <div className="flex flex-col gap-2">
                                    {rejected.map(q => (
                                        <div key={q.id} className="rounded-xl px-4 py-3 flex items-start gap-3"
                                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                            <p className="text-sm flex-1 line-through" style={{ color: "rgba(255,255,255,0.25)" }}>
                                                {q.text}
                                            </p>
                                            <button onClick={() => handleRestoreApprove(q)}
                                                disabled={actionLoading[q.id]}
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

                {/* ══ LIVE AGENDA ══════════════════════════════════════════════ */}
                {tab === "agenda" && (
                    <motion.div key="agenda" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }} className="px-5 py-6">

                        <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            Tap a session to mark it live. Updates the public page and projection screen instantly.
                        </p>

                        {liveItemId && (
                            <div className="rounded-xl px-4 py-3 mb-5 flex items-center justify-between"
                                style={{ background: "rgba(232,92,41,0.08)", border: "1px solid rgba(232,92,41,0.2)" }}>
                                <div className="flex items-center gap-2">
                                    <motion.div className="w-2 h-2 rounded-full" style={{ background: accent }}
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.4 }} />
                                    <span className="text-sm font-semibold text-white truncate">
                                        {agendaItems.find(i => i.id === liveItemId)?.title ?? "Session live"}
                                    </span>
                                </div>
                                <button onClick={() => handleSetLive(liveItemId)}
                                    className="text-xs font-semibold px-3 py-1 rounded-lg shrink-0 ml-3"
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
                                            border: isLive ? "1px solid rgba(232,92,41,0.3)" : "1px solid rgba(255,255,255,0.06)",
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
                                                <p className="text-sm font-semibold truncate"
                                                    style={{ color: isLive ? "white" : "rgba(255,255,255,0.7)" }}>
                                                    {item.title}
                                                </p>
                                                {item.speaker && (
                                                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                                                        {item.speaker}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="shrink-0">
                                                {loading ? (
                                                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                                                        style={{ borderColor: `${accent} transparent transparent transparent` }} />
                                                ) : isLive ? (
                                                    <motion.div className="w-2.5 h-2.5 rounded-full" style={{ background: accent }}
                                                        animate={{ opacity: [1, 0.3, 1] }}
                                                        transition={{ repeat: Infinity, duration: 1.4 }} />
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

                {/* ══ RATINGS ══════════════════════════════════════════════════ */}
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
                                No ratings yet. They appear here as attendees rate sessions
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
                {/* ══ POLLS ════════════════════════════════════════════════════ */}
                {tab === "polls" && (
                    <motion.div key="polls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }} className="px-5 py-6 flex flex-col gap-6">

                        {/* Create button / form */}
                        {!showCreatePoll ? (
                            <button onClick={() => setShowCreatePoll(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
                                style={{ background: `${accent}18`, border: `1px dashed ${accent}50`, color: accent }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                New Poll
                            </button>
                        ) : (
                            <div className="rounded-2xl p-5 flex flex-col gap-4"
                                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}40` }}>
                                <h3 className="text-white font-bold text-sm">New Poll</h3>

                                {/* Question */}
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Question
                                    </label>
                                    <input
                                        type="text"
                                        value={newQuestion}
                                        onChange={e => setNewQuestion(e.target.value)}
                                        placeholder="What would you like to ask?"
                                        className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                    />
                                </div>

                                {/* Options */}
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Options
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        {newOptions.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={e => setNewOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                                                    placeholder={`Option ${i + 1}`}
                                                    className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
                                                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                                />
                                                {newOptions.length > 2 && (
                                                    <button onClick={() => setNewOptions(prev => prev.filter((_, j) => j !== i))}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                                                        style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)" }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {newOptions.length < 6 && (
                                            <button onClick={() => setNewOptions(prev => [...prev, ""])}
                                                className="text-xs font-semibold py-1.5 rounded-xl transition-opacity hover:opacity-70"
                                                style={{ color: "rgba(255,255,255,0.35)" }}>
                                                + Add option
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-1">
                                    <button onClick={handleCreatePoll} disabled={creating || !newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2}
                                        className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
                                        style={{ background: accent }}>
                                        {creating ? "Creating..." : "Create Poll"}
                                    </button>
                                    <button onClick={() => { setShowCreatePoll(false); setNewQuestion(""); setNewOptions(["", ""]); }}
                                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                                        style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Poll list */}
                        {polls.length === 0 && !showCreatePoll ? (
                            <p className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                                No polls yet. Create one above and attendees can vote in real time
                            </p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {polls.map(poll => {
                                    const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
                                    const isEditing = editingPollId === poll.id;
                                    const isDeleting = deletingPollId === poll.id;

                                    return (
                                        <div key={poll.id} className="rounded-2xl overflow-hidden"
                                            style={{ border: `1px solid ${poll.isActive ? "rgba(232,92,41,0.2)" : "rgba(255,255,255,0.07)"}`, background: poll.isActive ? "rgba(232,92,41,0.04)" : "rgba(255,255,255,0.03)" }}>

                                            {/* Poll header */}
                                            <div className="px-4 pt-4 pb-3">
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-3">
                                                        <input
                                                            type="text"
                                                            value={editPollQuestion}
                                                            onChange={e => setEditPollQuestion(e.target.value)}
                                                            className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none font-semibold"
                                                            style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${accent}` }}
                                                        />
                                                        <div className="flex flex-col gap-2">
                                                            {editPollOptions.map((opt, i) => (
                                                                <div key={opt.id} className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={opt.text}
                                                                        onChange={e => setEditPollOptions(prev => prev.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                                                                        className="flex-1 rounded-xl px-3 py-1.5 text-sm text-white outline-none"
                                                                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                                                    />
                                                                    {editPollOptions.length > 2 && (
                                                                        <button onClick={() => setEditPollOptions(prev => prev.filter((_, j) => j !== i))}
                                                                            className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                                                                            style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)" }}>
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {editPollOptions.length < 6 && (
                                                                <button onClick={() => setEditPollOptions(prev => [...prev, { id: Math.random().toString(36).slice(2, 10), text: "", votes: [] }])}
                                                                    className="text-xs font-semibold py-1 transition-opacity hover:opacity-70"
                                                                    style={{ color: "rgba(255,255,255,0.35)" }}>
                                                                    + Add option
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={handleSavePoll} disabled={savingPoll}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                                                style={{ background: accent }}>
                                                                {savingPoll ? "Saving..." : "Save"}
                                                            </button>
                                                            <button onClick={() => setEditingPollId(null)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                                style={{ color: "rgba(255,255,255,0.4)" }}>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-white font-semibold text-sm leading-snug mb-3">{poll.question}</p>

                                                        {/* Options with vote bars */}
                                                        <div className="flex flex-col gap-2 mb-3">
                                                            {poll.options.map(opt => {
                                                                const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                                                                return (
                                                                    <div key={opt.id}>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-xs text-white" style={{ opacity: 0.75 }}>{opt.text}</span>
                                                                            <span className="text-xs font-bold tabular-nums"
                                                                                style={{ color: "rgba(255,255,255,0.4)" }}>
                                                                                {opt.votes.length} ({pct}%)
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-1.5 rounded-full overflow-hidden"
                                                                            style={{ background: "rgba(255,255,255,0.07)" }}>
                                                                            <div className="h-full rounded-full transition-all duration-500"
                                                                                style={{ width: `${pct}%`, background: poll.isActive ? accent : "rgba(255,255,255,0.25)" }} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                                            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                                                        </p>
                                                    </>
                                                )}
                                            </div>

                                            {/* Poll controls */}
                                            {!isEditing && (
                                                <div className="px-4 py-3 flex items-center gap-2 flex-wrap"
                                                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

                                                    {/* Active toggle */}
                                                    <button onClick={() => handleToggleActive(poll)}
                                                        disabled={pollLoading[poll.id]}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                                                        style={{
                                                            background: poll.isActive ? "rgba(232,92,41,0.15)" : "rgba(255,255,255,0.06)",
                                                            color: poll.isActive ? accent : "rgba(255,255,255,0.4)",
                                                        }}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${poll.isActive ? "" : "opacity-40"}`}
                                                            style={{ background: poll.isActive ? accent : "currentColor" }} />
                                                        {pollLoading[poll.id] ? "..." : poll.isActive ? "Open" : "Closed"}
                                                    </button>

                                                    {/* Show results toggle */}
                                                    <button onClick={() => handleToggleResults(poll)}
                                                        disabled={pollLoading[poll.id + "_results"]}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                                                        style={{
                                                            background: poll.showResults ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
                                                            color: poll.showResults ? "#22c55e" : "rgba(255,255,255,0.4)",
                                                        }}>
                                                        {pollLoading[poll.id + "_results"] ? "..." : poll.showResults ? "Results visible" : "Results hidden"}
                                                    </button>

                                                    <div className="flex-1" />

                                                    {/* Edit */}
                                                    <button onClick={() => startEditPoll(poll)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70"
                                                        style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)" }}>
                                                        Edit
                                                    </button>

                                                    {/* Delete */}
                                                    {isDeleting ? (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Delete?</span>
                                                            <button onClick={() => handleDeletePoll(poll.id)}
                                                                disabled={pollLoading[poll.id + "_delete"]}
                                                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                                                                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                                                                {pollLoading[poll.id + "_delete"] ? "..." : "Yes"}
                                                            </button>
                                                            <button onClick={() => setDeletingPollId(null)}
                                                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                                                style={{ color: "rgba(255,255,255,0.3)" }}>
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setDeletingPollId(poll.id)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70"
                                                            style={{ color: "rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.07)" }}>
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

        </div>
    );
}
