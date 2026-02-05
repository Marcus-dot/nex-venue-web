"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
    Loader2,
    LogOut,
    Settings,
    User as UserIcon,
    Calendar,
    MessageSquare,
    Shield,
    Clock,
    HelpCircle,
    TrendingUp,
    Heart,
    Users,
    ChevronRight
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { eventService } from "@/services/events";
import { cn } from "@/lib/utils/cn";
import gsap from "gsap";

export default function ProfilePage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState({
        eventsCreated: 0,
        eventsAttending: 0,
        totalAttendees: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login?redirect=/profile");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            const [created, attending] = await Promise.all([
                eventService.getEventsByCreator(user.uid),
                eventService.getAttendingEvents(user.uid)
            ]);

            const total = created.reduce((acc, curr) => acc + (curr.attendees?.length || 0), 0);

            setStats({
                eventsCreated: created.length,
                eventsAttending: attending.length,
                totalAttendees: total
            });
            setLoading(false);

            gsap.from(".profile-animate", {
                y: 20,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: "power2.out"
            });
        };

        fetchStats();
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }

    if (!user) return null;

    const getInitials = () => {
        if (profile?.fullName) {
            const names = profile.fullName.split(' ');
            return names.map(n => n[0]).join('').toUpperCase();
        }
        return user.email?.[0].toUpperCase() || 'U';
    };

    return (
        <div className="min-h-screen bg-background pt-24 pb-20 px-8">
            <main className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left Side: Identity */}
                    <div className="lg:col-span-4 space-y-8">
                        <GlassCard className="text-center !p-10 profile-animate">
                            <div className="relative inline-block mb-6">
                                <div className="w-32 h-32 rounded-full bg-accent flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-accent/20">
                                    {getInitials()}
                                </div>
                                <div className="absolute bottom-1 right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full" />
                            </div>

                            <h2 className="text-3xl font-black text-surface-dark mb-2 tracking-tighter">
                                {profile?.fullName || "NexVenue User"}
                            </h2>
                            <p className="text-surface-dark/40 font-bold text-sm mb-8">{user.email}</p>

                            <div className="flex flex-col gap-2">
                                {profile?.role === 'admin' && (
                                    <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-black uppercase tracking-widest">
                                        <Shield size={14} /> Administrator
                                    </div>
                                )}
                                <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-surface-dark/5 text-surface-dark/60 text-xs font-black uppercase tracking-widest">
                                    Member since {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '2026'}
                                </div>
                            </div>
                        </GlassCard>

                        <div className="space-y-3 profile-animate">
                            <h4 className="text-xs font-black text-surface-dark/30 uppercase tracking-widest px-4">Account Essentials</h4>
                            {[
                                { label: "Edit Profile", icon: UserIcon, sub: "Update your personal details" },
                                { label: "Direct Messages", icon: MessageSquare, sub: "View your active conversations", href: "/chat" },
                                { label: "Preferences", icon: Settings, sub: "App theme and notifications" },
                                { label: "Help & Support", icon: HelpCircle, sub: "Contact specialized assistance" }
                            ].map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => item.href && router.push(item.href)}
                                    className="w-full p-6 flex items-center gap-4 bg-white/50 border border-transparent hover:border-accent/20 hover:bg-white rounded-3xl transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                        <item.icon size={22} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-black text-surface-dark">{item.label}</div>
                                        <div className="text-xs font-bold text-surface-dark/30">{item.sub}</div>
                                    </div>
                                    <ChevronRight size={18} className="text-surface-dark/20 group-hover:translate-x-1 transition-transform" />
                                </button>
                            ))}

                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                className="w-full h-16 rounded-3xl text-error hover:bg-error/5 font-black text-sm uppercase tracking-widest mt-6"
                            >
                                <LogOut size={18} className="mr-2" /> Sign Out
                            </Button>
                        </div>
                    </div>

                    {/* Right Side: Analytics & Activity */}
                    <div className="lg:col-span-8 space-y-12">

                        {/* Stats Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 profile-animate">
                            {[
                                { label: "Events Created", value: stats.eventsCreated, icon: Calendar, color: "text-accent", bg: "bg-accent/10" },
                                { label: "Attending", value: stats.eventsAttending, icon: Heart, color: "text-green-500", bg: "bg-green-500/10" },
                                { label: "Total Reach", value: stats.totalAttendees, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" }
                            ].map((stat, i) => (
                                <GlassCard key={i} className="!p-8 group hover:-translate-y-1 transition-transform">
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", stat.bg, stat.color)}>
                                        <stat.icon size={24} />
                                    </div>
                                    <div className="text-4xl font-black text-surface-dark mb-1">{stat.value}</div>
                                    <div className="text-xs font-bold text-surface-dark/40 uppercase tracking-widest">{stat.label}</div>
                                </GlassCard>
                            ))}
                        </div>

                        {/* Recent Activity / Timeline */}
                        <div className="space-y-6 profile-animate">
                            <div className="flex items-center justify-between">
                                <h3 className="text-3xl font-black text-surface-dark tracking-tighter">Event Timeline</h3>
                                <Button variant="ghost" className="font-bold text-accent">View Full History</Button>
                            </div>

                            <GlassCard className="!p-20 text-center">
                                <div className="w-24 h-24 bg-surface-dark/5 rounded-full flex items-center justify-center text-surface-dark/10 mx-auto mb-8">
                                    <Clock size={48} />
                                </div>
                                <h4 className="text-2xl font-black text-surface-dark mb-4">No recent history</h4>
                                <p className="text-surface-dark/60 font-medium max-w-sm mx-auto mb-10">
                                    Your event activity will appear here. Start by attending or creating an event!
                                </p>
                                <Button size="lg" onClick={() => router.push("/events")} className="px-10 h-14 font-black">
                                    Explore Events
                                </Button>
                            </GlassCard>
                        </div>

                        {/* Admin Section (Experimental) */}
                        {profile?.role === 'admin' && (
                            <GlassCard className="!p-8 border-l-8 border-l-accent profile-animate">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-surface-dark">Administrative Access</h4>
                                        <p className="text-sm font-bold text-surface-dark/40">You have high-level permissions</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-surface-dark/5 border border-surface-dark/5">
                                        <div className="font-bold text-surface-dark mb-1">Global User Management</div>
                                        <div className="text-xs font-medium text-surface-dark/40">Audit and manage 12k+ users</div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-surface-dark/5 border border-surface-dark/5">
                                        <div className="font-bold text-surface-dark mb-1">Moderation Tools</div>
                                        <div className="text-xs font-medium text-surface-dark/40">Review flagged events and chats</div>
                                    </div>
                                </div>
                            </GlassCard>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
