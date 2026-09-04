"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getCountFromServer, getDocs } from "firebase/firestore";
import { eventService } from "@/services/events";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Users, UserCheck, MessageSquare, Star, BarChart3,
    CalendarDays, ArrowRight, ArrowLeft, Download,
} from "lucide-react";
import { downloadCSV } from "@/lib/exportAttendees";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

interface EventStat {
    id: string;
    title: string;
    date: string;
    attendees: number;
    checkedIn: number;
    questions: number;
    polls: number;
    ratingAvg: number;
    ratingCount: number;
}

export default function AnalyticsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<EventStat[]>([]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push("/login?redirect=/analytics"); return; }

        let active = true;
        (async () => {
            const events = await eventService.getEventsByCreator(user.uid);
            const stats = await Promise.all(events.map(async (ev): Promise<EventStat> => {
                const [ci, q, p, ratingsSnap] = await Promise.all([
                    getCountFromServer(query(collection(db, "checkIns"), where("eventId", "==", ev.id))),
                    getCountFromServer(query(collection(db, "questions"), where("eventId", "==", ev.id))),
                    getCountFromServer(query(collection(db, "polls"), where("eventId", "==", ev.id))),
                    getDocs(query(collection(db, "ratings"), where("eventId", "==", ev.id))),
                ]);
                const scores = ratingsSnap.docs.map((d) => (d.data().score as number) ?? 0);
                return {
                    id: ev.id,
                    title: ev.title,
                    date: ev.date,
                    attendees: ev.attendees?.length ?? 0,
                    checkedIn: ci.data().count,
                    questions: q.data().count,
                    polls: p.data().count,
                    ratingAvg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
                    ratingCount: scores.length,
                };
            }));
            if (!active) return;
            setRows(stats);
            setLoading(false);
        })();

        return () => { active = false; };
    }, [user, authLoading, router]);

    const totals = useMemo(() => {
        const attendees = rows.reduce((s, r) => s + r.attendees, 0);
        const checkedIn = rows.reduce((s, r) => s + r.checkedIn, 0);
        const ratingWeight = rows.reduce((s, r) => s + r.ratingAvg * r.ratingCount, 0);
        const ratingCount = rows.reduce((s, r) => s + r.ratingCount, 0);
        return {
            events: rows.length,
            attendees,
            checkedIn,
            checkInRate: attendees ? Math.round((checkedIn / attendees) * 100) : 0,
            questions: rows.reduce((s, r) => s + r.questions, 0),
            polls: rows.reduce((s, r) => s + r.polls, 0),
            avgRating: ratingCount ? ratingWeight / ratingCount : 0,
        };
    }, [rows]);

    const maxAttendees = Math.max(1, ...rows.map((r) => r.attendees));

    const handleExportCSV = () => {
        const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const line = (...cells: (string | number)[]) => cells.map(esc).join(",");
        const lines = [
            esc("NexVenue Portfolio Analytics"),
            "",
            line("Event", "Date", "Attendees", "Checked in", "Check-in %", "Questions", "Polls", "Avg rating", "Ratings"),
            ...rows.map((r) => line(
                r.title, r.date, r.attendees, r.checkedIn,
                r.attendees ? Math.round((r.checkedIn / r.attendees) * 100) : 0,
                r.questions, r.polls, r.ratingCount ? r.ratingAvg.toFixed(2) : "", r.ratingCount,
            )),
            "",
            line("Totals", "", totals.attendees, totals.checkedIn, totals.checkInRate, totals.questions, totals.polls, totals.avgRating ? totals.avgRating.toFixed(2) : "", ""),
        ];
        downloadCSV("nexvenue-analytics.csv", lines.join("\n"));
    };

    if (loading) {
        return <LoadingSkeleton stats={6} cards={2} />;
    }

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] pt-24 pb-20 px-8">
            <div className="max-w-7xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-surface-dark/60 dark:text-white/50 hover:text-accent transition-colors mb-6">
                    <ArrowLeft size={18} /> Back to Dashboard
                </Link>

                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-5xl font-black text-surface-dark dark:text-white tracking-tighter mb-2">Analytics</h1>
                        <p className="text-surface-dark/60 dark:text-white/60 text-lg font-medium">Portfolio performance across all your events.</p>
                    </div>
                    {rows.length > 0 && (
                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-dark/5 dark:bg-white/5 hover:bg-surface-dark/10 dark:hover:bg-white/10 text-surface-dark dark:text-white text-sm font-bold transition-colors shrink-0"
                        >
                            <Download size={16} /> Export CSV
                        </button>
                    )}
                </div>

                {rows.length === 0 ? (
                    <GlassCard className="p-16 text-center">
                        <BarChart3 size={40} className="mx-auto text-surface-dark/20 dark:text-white/20 mb-4" />
                        <p className="font-bold text-surface-dark/60 dark:text-white/50">No events yet</p>
                        <p className="text-sm text-surface-dark/55 dark:text-white/40 mt-1 font-medium">Host an event and its analytics will appear here.</p>
                        <Link href="/events/create" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold">Create Event</Link>
                    </GlassCard>
                ) : (
                    <>
                        {/* Portfolio summary */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
                            <Stat icon={<CalendarDays size={18} />} label="Events" value={totals.events} />
                            <Stat icon={<Users size={18} />} label="Total attendees" value={totals.attendees} />
                            <Stat icon={<UserCheck size={18} />} label="Check-in rate" value={`${totals.checkInRate}%`} />
                            <Stat icon={<MessageSquare size={18} />} label="Questions" value={totals.questions} />
                            <Stat icon={<BarChart3 size={18} />} label="Polls" value={totals.polls} />
                            <Stat icon={<Star size={18} />} label="Avg rating" value={totals.avgRating ? totals.avgRating.toFixed(1) : ", "} />
                        </div>

                        {/* Attendees by event */}
                        <GlassCard className="p-8 mb-8">
                            <h2 className="text-xl font-bold text-surface-dark dark:text-white mb-6">Attendees by event</h2>
                            <div className="space-y-4">
                                {[...rows].sort((a, b) => b.attendees - a.attendees).map((r) => (
                                    <div key={r.id}>
                                        <div className="flex justify-between text-sm font-bold text-surface-dark/70 dark:text-white/70 mb-1.5">
                                            <span className="truncate pr-3">{r.title}</span>
                                            <span className="shrink-0 text-surface-dark/55 dark:text-white/40">{r.attendees}</span>
                                        </div>
                                        <div className="h-2.5 rounded-full bg-surface-dark/5 dark:bg-white/5 overflow-hidden">
                                            <div className="h-full rounded-full bg-accent" style={{ width: `${(r.attendees / maxAttendees) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        {/* Per-event comparison */}
                        <GlassCard className="p-0 overflow-hidden">
                            <div className="px-8 py-6 border-b border-surface-dark/5 dark:border-white/5">
                                <h2 className="text-xl font-bold text-surface-dark dark:text-white">Event breakdown</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-surface-dark/55 dark:text-white/40 border-b border-surface-dark/5 dark:border-white/5">
                                            <th className="px-8 py-3 font-black">Event</th>
                                            <th className="px-4 py-3 font-bold text-right">Attendees</th>
                                            <th className="px-4 py-3 font-bold text-right">Checked in</th>
                                            <th className="px-4 py-3 font-bold text-right">Q&amp;A</th>
                                            <th className="px-4 py-3 font-bold text-right">Polls</th>
                                            <th className="px-4 py-3 font-bold text-right">Rating</th>
                                            <th className="px-8 py-3 font-bold text-right">Report</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r) => {
                                            const rate = r.attendees ? Math.round((r.checkedIn / r.attendees) * 100) : 0;
                                            return (
                                                <tr key={r.id} className="border-b border-surface-dark/5 dark:border-white/5 last:border-0 hover:bg-surface-dark/[0.02] dark:hover:bg-white/[0.02]">
                                                    <td className="px-8 py-4">
                                                        <div className="font-bold text-surface-dark dark:text-white truncate max-w-xs">{r.title}</div>
                                                        <div className="text-xs font-medium text-surface-dark/55 dark:text-white/40">{r.date}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-surface-dark dark:text-white tabular-nums">{r.attendees}</td>
                                                    <td className="px-4 py-4 text-right font-bold text-surface-dark/70 dark:text-white/70 tabular-nums">{r.checkedIn}<span className="text-surface-dark/45 dark:text-white/30"> ({rate}%)</span></td>
                                                    <td className="px-4 py-4 text-right font-bold text-surface-dark/70 dark:text-white/70 tabular-nums">{r.questions}</td>
                                                    <td className="px-4 py-4 text-right font-bold text-surface-dark/70 dark:text-white/70 tabular-nums">{r.polls}</td>
                                                    <td className="px-4 py-4 text-right">
                                                        {r.ratingCount ? (
                                                            <span className="inline-flex items-center gap-1 font-bold text-accent tabular-nums"><Star size={12} className="fill-accent" /> {r.ratingAvg.toFixed(1)}</span>
                                                        ) : <span className="text-surface-dark/45 dark:text-white/30">, </span>}
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <Link href={`/events/${r.id}/report`} className="inline-flex items-center gap-1 text-accent font-bold hover:underline">
                                                            View <ArrowRight size={13} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </>
                )}
            </div>
        </div>
    );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
    return (
        <GlassCard className="p-5">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-3">{icon}</div>
            <div className="text-2xl font-bold text-surface-dark dark:text-white tabular-nums">{value}</div>
            <div className="text-[11px] font-bold text-surface-dark/60 dark:text-white/50 mt-0.5 uppercase tracking-wider">{label}</div>
        </GlassCard>
    );
}
