"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Settings, User as UserIcon, Calendar, MessageSquare } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";

export default function ProfilePage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background">
            <header className="bg-white/80 backdrop-blur-xl border-b border-surface-dark/5 px-8 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold">N</div>
                        <span className="text-xl font-bold tracking-tight text-surface-dark">NexVenue</span>
                    </div>
                    <Button variant="ghost" onClick={handleLogout} className="text-error hover:bg-error/5 flex items-center gap-2">
                        <LogOut size={18} /> Logout
                    </Button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar */}
                    <div className="space-y-6">
                        <GlassCard className="text-center">
                            <div className="w-24 h-24 rounded-full bg-accent/10 border-4 border-accent/20 flex items-center justify-center text-accent text-4xl font-black mx-auto mb-4">
                                {profile?.fullName?.[0] || user.email?.[0].toUpperCase()}
                            </div>
                            <h2 className="text-2xl font-black text-surface-dark">{profile?.fullName || "User"}</h2>
                            <p className="text-surface-dark/40 font-bold text-sm mb-6">{user.email}</p>

                            <div className="py-3 px-4 rounded-xl bg-accent/5 text-accent text-xs font-black uppercase tracking-widest inline-block">
                                Attendee
                            </div>
                        </GlassCard>

                        <div className="space-y-2">
                            <button className="w-full p-4 flex items-center gap-3 bg-white hover:bg-black/5 rounded-2xl font-bold text-surface-dark transition-all">
                                <UserIcon size={20} className="text-accent" /> Account Settings
                            </button>
                            <button className="w-full p-4 flex items-center gap-3 bg-white hover:bg-black/5 rounded-2xl font-bold text-surface-dark transition-all">
                                <MessageSquare size={20} className="text-accent" /> My Chats
                            </button>
                            <button className="w-full p-4 flex items-center gap-3 bg-white hover:bg-black/5 rounded-2xl font-bold text-surface-dark transition-all">
                                <Settings size={20} className="text-accent" /> Preferences
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-8">
                        <h3 className="text-3xl font-black text-surface-dark">Recent Activity</h3>

                        <GlassCard className="!p-8">
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 bg-surface-dark/5 rounded-full flex items-center justify-center text-surface-dark/20 mb-6">
                                    <Calendar size={40} />
                                </div>
                                <h4 className="text-xl font-black text-surface-dark mb-2">No registered events</h4>
                                <p className="text-surface-dark/60 max-w-xs mb-8">
                                    You haven't joined any events yet. Explore the feed to find your next experience.
                                </p>
                                <Button onClick={() => router.push("/events")}>Browse Events</Button>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </main>
        </div>
    );
}
