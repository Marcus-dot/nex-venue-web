"use client";

import { use, useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { AnimatePresence, motion } from "framer-motion";

interface Question {
    id: string;
    eventId: string;
    text: string;
    authorName: string;
    isAnonymous: boolean;
    status: "pending" | "approved" | "rejected" | "answered";
    upvotes: string[];
    createdAt: number;
    approvedAt?: number;
    answeredAt?: number;
}

function UpvoteIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2L14 9H10V14H6V9H2L8 2Z" />
        </svg>
    );
}

export default function QADisplayPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [spotlightId, setSpotlightId] = useState<string | null>(null);
    const [clock, setClock] = useState("");
    const prevApprovedIds = useRef<Set<string>>(new Set());

    // Clock tick — client-only to avoid hydration mismatch
    useEffect(() => {
        const fmt = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setClock(fmt());
        const t = setInterval(() => setClock(fmt()), 10000);
        return () => clearInterval(t);
    }, []);

    // Firestore real-time listener
    useEffect(() => {
        const q = query(
            collection(db, "questions"),
            where("eventId", "==", eventId),
            where("status", "in", ["approved", "answered"])
        );

        const unsub = onSnapshot(q, (snap) => {
            const incoming: Question[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<Question, "id">),
            }));

            // Sort: most upvotes first, then oldest first (mirrors mobile app)
            incoming.sort((a, b) => {
                const diff = (b.upvotes?.length ?? 0) - (a.upvotes?.length ?? 0);
                return diff !== 0 ? diff : a.createdAt - b.createdAt;
            });

            setQuestions(incoming);

            // Spotlight: the most recently approved question
            const newIds = new Set(incoming.map((q) => q.id));
            const brandNew = incoming.find((q) => !prevApprovedIds.current.has(q.id));
            if (brandNew) {
                setSpotlightId(brandNew.id);
            } else if (incoming.length > 0 && !spotlightId) {
                // On first load, spotlight the most recently approved
                const latest = [...incoming].sort((a, b) => (b.approvedAt ?? b.createdAt) - (a.approvedAt ?? a.createdAt))[0];
                setSpotlightId(latest.id);
            }
            prevApprovedIds.current = newIds;
        });

        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const spotlight = questions.find((q) => q.id === spotlightId) ?? questions[0] ?? null;
    const queue = questions.filter((q) => q.id !== spotlight?.id);

    return (
        <div
            className="min-h-screen w-full flex flex-col"
            style={{ background: "#0b0c1a", fontFamily: "var(--font-rubik), sans-serif" }}
        >
            {/* ── Header ── */}
            <header
                className="flex items-center justify-between px-10 py-5 border-b"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
                <div className="flex items-center gap-4">
                    {/* Logo dot */}
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: "#e85c29", boxShadow: "0 0 12px #e85c29" }}
                    />
                    <span className="text-white font-semibold text-lg tracking-wide">
                        Live Q&amp;A
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                        {questions.length} question{questions.length !== 1 ? "s" : ""} queued
                    </span>
                    <span
                        className="text-sm font-medium tabular-nums"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                        {clock}
                    </span>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="flex flex-col flex-1 px-10 py-8 gap-8 overflow-hidden">

                {/* Empty state */}
                {questions.length === 0 && (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="text-center">
                            <div
                                className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                                style={{ background: "rgba(232,92,41,0.1)", border: "1px solid rgba(232,92,41,0.2)" }}
                            >
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e85c29" strokeWidth="1.5">
                                    <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <p className="text-white text-xl font-semibold mb-2">Waiting for questions</p>
                            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
                                Approved questions will appear here in real time
                            </p>
                        </div>
                    </div>
                )}

                {questions.length > 0 && (
                    <>
                        {/* ── Spotlight ── */}
                        <AnimatePresence mode="wait">
                            {spotlight && (
                                <motion.div
                                    key={spotlight.id}
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                    className="rounded-2xl p-8 relative overflow-hidden"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(232,92,41,0.12) 0%, rgba(232,92,41,0.04) 100%)",
                                        border: "1px solid rgba(232,92,41,0.25)",
                                        boxShadow: "0 0 60px rgba(232,92,41,0.08)",
                                    }}
                                >
                                    {/* Glow blob */}
                                    <div
                                        className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
                                        style={{
                                            background: "radial-gradient(circle, rgba(232,92,41,0.15) 0%, transparent 70%)",
                                        }}
                                    />

                                    {/* Now answering label */}
                                    <div className="flex items-center gap-2 mb-5">
                                        <motion.div
                                            className="w-2 h-2 rounded-full"
                                            style={{ background: "#e85c29" }}
                                            animate={{ opacity: [1, 0.3, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                                        />
                                        <span
                                            className="text-xs font-semibold uppercase tracking-widest"
                                            style={{ color: "#e85c29", letterSpacing: "0.12em" }}
                                        >
                                            {spotlight.status === "answered" ? "Answered" : "Now answering"}
                                        </span>
                                    </div>

                                    {/* Question text */}
                                    <p
                                        className="text-white leading-snug mb-6"
                                        style={{ fontSize: "clamp(1.5rem, 3vw, 2.4rem)", fontWeight: 600, lineHeight: 1.3 }}
                                    >
                                        {spotlight.text}
                                    </p>

                                    {/* Meta row */}
                                    <div className="flex items-center gap-4">
                                        <span
                                            className="text-sm font-medium"
                                            style={{ color: "rgba(255,255,255,0.5)" }}
                                        >
                                            {spotlight.isAnonymous ? "Anonymous" : spotlight.authorName}
                                        </span>
                                        {(spotlight.upvotes?.length ?? 0) > 0 && (
                                            <span
                                                className="flex items-center gap-1.5 text-sm font-semibold"
                                                style={{ color: "#e85c29" }}
                                            >
                                                <UpvoteIcon />
                                                {spotlight.upvotes.length}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Queue ── */}
                        {queue.length > 0 && (
                            <div>
                                <p
                                    className="text-xs font-semibold uppercase tracking-widest mb-4"
                                    style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}
                                >
                                    Up next
                                </p>
                                <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: "38vh" }}>
                                    <AnimatePresence initial={false}>
                                        {queue.map((q, i) => (
                                            <motion.div
                                                key={q.id}
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 12 }}
                                                transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
                                                className="flex items-start gap-4 rounded-xl px-5 py-4 cursor-pointer group"
                                                style={{
                                                    background: "rgba(255,255,255,0.03)",
                                                    border: "1px solid rgba(255,255,255,0.06)",
                                                    transition: "background 0.2s",
                                                }}
                                                onClick={() => setSpotlightId(q.id)}
                                                onMouseEnter={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                                                }}
                                            >
                                                {/* Index */}
                                                <span
                                                    className="text-sm font-bold tabular-nums mt-0.5 w-5 shrink-0 text-center"
                                                    style={{ color: "rgba(255,255,255,0.2)" }}
                                                >
                                                    {i + 2}
                                                </span>

                                                <p
                                                    className="text-white flex-1 leading-snug"
                                                    style={{ fontSize: 15, fontWeight: 400, opacity: 0.75 }}
                                                >
                                                    {q.text}
                                                </p>

                                                <div className="flex items-center gap-3 shrink-0 mt-0.5">
                                                    {q.status === "answered" && (
                                                        <span
                                                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                                                        >
                                                            Answered
                                                        </span>
                                                    )}
                                                    {(q.upvotes?.length ?? 0) > 0 && (
                                                        <span
                                                            className="flex items-center gap-1 text-xs font-semibold"
                                                            style={{ color: "rgba(232,92,41,0.7)" }}
                                                        >
                                                            <UpvoteIcon />
                                                            {q.upvotes.length}
                                                        </span>
                                                    )}
                                                    <span
                                                        className="text-xs"
                                                        style={{ color: "rgba(255,255,255,0.25)" }}
                                                    >
                                                        {q.isAnonymous ? "Anonymous" : q.authorName}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Footer ── */}
            <footer
                className="px-10 py-4 flex items-center justify-between border-t"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
                <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>
                    Scan the QR code to submit questions
                </span>
                <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em" }}>
                    NEXVENUE
                </span>
            </footer>
        </div>
    );
}
