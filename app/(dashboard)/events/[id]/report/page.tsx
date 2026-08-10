"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { eventService } from "@/services/events";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import type { Event } from "@/types/events";
import type { AgendaItem } from "@/types/agenda";
import {
    ArrowLeft, Printer, Loader2, Users, UserCheck, CalendarDays,
    MessageSquare, BarChart3, Star, ThumbsUp,
} from "lucide-react";

interface Question {
    id: string;
    text: string;
    authorName?: string;
    isAnonymous?: boolean;
    status: "pending" | "approved" | "answered" | "rejected";
    upvotes?: string[];
}
interface PollOption { id: string; text: string; votes: string[] }
interface Poll { id: string; question: string; options: PollOption[] }
interface Rating { agendaItemId: string; score: number }

export default function EventReportPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<Event | null>(null);
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [checkInCount, setCheckInCount] = useState(0);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push(`/login?redirect=/events/${id}/report`); return; }

        let active = true;
        (async () => {
            const ev = await eventService.getEventById(id);
            if (!ev) { router.push("/events"); return; }

            // Organiser / creator / admin only.
            const fresh = await authService.getUserProfile(user.uid);
            const allowed = ev.creatorId === user.uid || ev.organisers?.includes(user.uid) || fresh?.role === "admin";
            if (!allowed) { router.push(`/events/${id}`); return; }

            const [agendaSnap, qSnap, pSnap, rSnap, ciSnap] = await Promise.all([
                getDocs(query(collection(db, "agendas"), where("eventId", "==", id))),
                getDocs(query(collection(db, "questions"), where("eventId", "==", id))),
                getDocs(query(collection(db, "polls"), where("eventId", "==", id))),
                getDocs(query(collection(db, "ratings"), where("eventId", "==", id))),
                getDocs(query(collection(db, "checkIns"), where("eventId", "==", id))),
            ]);
            if (!active) return;

            setEvent(ev);
            setAgenda(agendaSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AgendaItem));
            setQuestions(qSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question));
            setPolls(pSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Poll));
            setRatings(rSnap.docs.map((d) => d.data() as Rating));
            setCheckInCount(ciSnap.size);
            setLoading(false);
        })();

        return () => { active = false; };
    }, [id, user, authLoading, router]);

    const stats = useMemo(() => {
        const attendees = event?.attendees?.length ?? 0;
        const answered = questions.filter((q) => q.status === "answered").length;
        const rejected = questions.filter((q) => q.status === "rejected").length;
        const pending = questions.filter((q) => q.status === "pending" || q.status === "approved").length;
        return {
            attendees,
            checkedIn: checkInCount,
            checkInRate: attendees ? Math.round((checkInCount / attendees) * 100) : 0,
            sessions: agenda.length,
            qReceived: questions.length,
            qAnswered: answered,
            qRejected: rejected,
            qPending: pending,
            polls: polls.length,
            ratingsSubmitted: ratings.length,
        };
    }, [event, agenda, questions, polls, ratings, checkInCount]);

    const topQuestions = useMemo(
        () => [...questions]
            .sort((a, b) => (b.upvotes?.length ?? 0) - (a.upvotes?.length ?? 0))
            .slice(0, 10),
        [questions]
    );

    const pollResults = useMemo(() => polls.map((poll) => {
        const total = poll.options.reduce((s, o) => s + (o.votes?.length ?? 0), 0);
        const options = poll.options.map((o) => ({
            text: o.text,
            count: o.votes?.length ?? 0,
            pct: total ? Math.round(((o.votes?.length ?? 0) / total) * 100) : 0,
        }));
        // Weighted average when every option label is numeric (e.g. 25% / 50% / 75% / 100%).
        const values = poll.options.map((o) => parseFloat(o.text));
        const numeric = values.every((v) => Number.isFinite(v));
        const weighted = numeric && total
            ? Math.round(poll.options.reduce((s, o, i) => s + values[i] * (o.votes?.length ?? 0), 0) / total)
            : null;
        return { id: poll.id, question: poll.question, total, options, weighted };
    }), [polls]);

    const sessionRatings = useMemo(() => {
        const byItem: Record<string, number[]> = {};
        ratings.forEach((r) => { (byItem[r.agendaItemId] ??= []).push(r.score); });
        return Object.entries(byItem)
            .map(([itemId, scores]) => ({
                title: agenda.find((a) => a.id === itemId)?.title ?? "Unknown session",
                avg: scores.reduce((s, v) => s + v, 0) / scores.length,
                count: scores.length,
            }))
            .sort((a, b) => b.avg - a.avg);
    }, [ratings, agenda]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
                <Loader2 className="animate-spin text-accent" size={44} />
            </div>
        );
    }
    if (!event) return null;

    return (
        <div className="report-root min-h-screen bg-[#faf9f7] text-[#1f2937] pt-24 print:pt-0 pb-24 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Chrome (hidden when printing) */}
                <div className="flex items-center justify-between mb-8 print:hidden">
                    <Link href={`/events/${id}/manage`} className="flex items-center gap-2 text-sm font-bold text-[#6b7280] hover:text-accent transition-colors">
                        <ArrowLeft size={18} /> Back to Event Controls
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-black hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
                    >
                        <Printer size={16} /> Print / Save as PDF
                    </button>
                </div>

                {/* Header */}
                <header className="mb-10 pb-8 border-b border-[#e5e3df]">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-accent mb-2">Post-event report</p>
                    <h1 className="text-4xl font-black tracking-tight text-[#111827] mb-3">{event.title}</h1>
                    <p className="text-sm font-medium text-[#6b7280]">
                        {event.date}{event.location ? ` · ${event.location}` : ""}
                    </p>
                </header>

                {/* Summary stat grid */}
                <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
                    <StatCard icon={<Users size={18} />} label="Registered attendees" value={stats.attendees} />
                    <StatCard icon={<UserCheck size={18} />} label="Checked in" value={stats.checkedIn} sub={`${stats.checkInRate}% of registered`} />
                    <StatCard icon={<CalendarDays size={18} />} label="Sessions" value={stats.sessions} />
                    <StatCard icon={<MessageSquare size={18} />} label="Questions asked" value={stats.qReceived} sub={`${stats.qAnswered} answered`} />
                    <StatCard icon={<BarChart3 size={18} />} label="Polls run" value={stats.polls} />
                    <StatCard icon={<Star size={18} />} label="Session ratings" value={stats.ratingsSubmitted} />
                </section>

                {/* Q&A */}
                <ReportSection title="Audience Q&A" icon={<MessageSquare size={18} />}>
                    <div className="flex flex-wrap gap-3 mb-6">
                        <Pill label="Answered" value={stats.qAnswered} tone="green" />
                        <Pill label="Awaiting" value={stats.qPending} tone="amber" />
                        <Pill label="Rejected" value={stats.qRejected} tone="gray" />
                    </div>
                    {topQuestions.length === 0 ? (
                        <Empty>No questions were asked at this event.</Empty>
                    ) : (
                        <>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#9ca3af] mb-3">Top questions by upvotes</p>
                            <ol className="space-y-2.5">
                                {topQuestions.map((q, i) => (
                                    <li key={q.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#eceae6]">
                                        <span className="text-sm font-black text-[#d1cfc9] w-5 shrink-0">{i + 1}</span>
                                        <p className="flex-1 text-sm text-[#374151] leading-snug">{q.text}</p>
                                        <span className="flex items-center gap-1 text-xs font-bold text-accent shrink-0">
                                            <ThumbsUp size={12} /> {q.upvotes?.length ?? 0}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}
                </ReportSection>

                {/* Polls */}
                <ReportSection title="Live polls" icon={<BarChart3 size={18} />}>
                    {pollResults.length === 0 ? (
                        <Empty>No polls were run at this event.</Empty>
                    ) : (
                        <div className="space-y-6">
                            {pollResults.map((poll) => (
                                <div key={poll.id} className="p-5 rounded-xl bg-white border border-[#eceae6]">
                                    <div className="flex items-baseline justify-between gap-3 mb-4">
                                        <h4 className="font-black text-[#111827]">{poll.question}</h4>
                                        <span className="text-xs font-bold text-[#9ca3af] shrink-0">
                                            {poll.total} {poll.total === 1 ? "vote" : "votes"}
                                            {poll.weighted !== null && <span className="text-accent"> · avg {poll.weighted}%</span>}
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {poll.options.map((o, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between text-xs font-bold text-[#4b5563] mb-1">
                                                    <span>{o.text}</span>
                                                    <span className="text-[#9ca3af]">{o.count} ({o.pct}%)</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-[#f0eee9] overflow-hidden">
                                                    <div className="h-full rounded-full bg-accent" style={{ width: `${o.pct}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ReportSection>

                {/* Session ratings */}
                <ReportSection title="Session ratings" icon={<Star size={18} />}>
                    {sessionRatings.length === 0 ? (
                        <Empty>No sessions were rated at this event.</Empty>
                    ) : (
                        <div className="rounded-xl bg-white border border-[#eceae6] overflow-hidden">
                            {sessionRatings.map((s, i) => (
                                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#f0eee9] last:border-0">
                                    <span className="text-sm font-black text-[#d1cfc9] w-5 shrink-0">{i + 1}</span>
                                    <p className="flex-1 text-sm font-medium text-[#374151] truncate">{s.title}</p>
                                    <span className="text-xs text-[#9ca3af] shrink-0">{s.count} {s.count === 1 ? "rating" : "ratings"}</span>
                                    <span className="flex items-center gap-1 text-sm font-black text-accent shrink-0 w-14 justify-end">
                                        <Star size={13} className="fill-accent" /> {s.avg.toFixed(1)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </ReportSection>

                <p className="text-xs text-[#9ca3af] mt-12 text-center">Generated by NexVenue · {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
    return (
        <div className="p-5 rounded-2xl bg-white border border-[#eceae6]">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-3">{icon}</div>
            <div className="text-3xl font-black text-[#111827]">{value}</div>
            <div className="text-xs font-bold text-[#6b7280] mt-0.5">{label}</div>
            {sub && <div className="text-[11px] font-medium text-[#9ca3af] mt-1">{sub}</div>}
        </div>
    );
}

function ReportSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="mb-12 break-inside-avoid">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#111827] flex items-center justify-center text-white">{icon}</div>
                <h2 className="text-xl font-black text-[#111827]">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function Pill({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "gray" }) {
    const tones = {
        green: "bg-green-500/10 text-green-700",
        amber: "bg-amber-500/10 text-amber-700",
        gray: "bg-[#f0eee9] text-[#6b7280]",
    };
    return (
        <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-black ${tones[tone]}`}>
            {value} <span className="font-bold opacity-70">{label}</span>
        </span>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-[#9ca3af] font-medium py-4">{children}</p>;
}
