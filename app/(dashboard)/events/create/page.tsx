"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import Link from "next/link";

export default function CreateEventPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            await addDoc(collection(db, "events"), {
                ...formData,
                creatorId: user.uid,
                creatorName: user.email?.split('@')[0] || "Organizer",
                attendees: [user.uid],
                createdAt: Date.now(),
            });
            router.push("/events");
        } catch (error) {
            console.error("Error creating event:", error);
            setLoading(false);
        }
    };

    if (authLoading) return null;
    if (!user) {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-background px-8 py-12">
            <div className="max-w-2xl mx-auto">
                <Link href="/events" className="flex items-center gap-2 text-surface-dark/60 hover:text-accent font-medium mb-8">
                    <ArrowLeft size={20} /> Back to Feed
                </Link>

                <h1 className="text-4xl font-black text-surface-dark mb-4">Host an Event</h1>
                <p className="text-surface-dark/60 mb-12">Fill in the details to create your amazing event experience.</p>

                <GlassCard>
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark ml-1">Event Title</label>
                            <Input
                                placeholder="e.g. NexVenue Future Tech Expo"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark ml-1">Description</label>
                            <textarea
                                className="w-full px-5 py-4 bg-white/50 border border-surface-dark/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 placeholder:text-surface-dark/30 text-surface-dark font-medium min-h-[120px]"
                                placeholder="What is your event about?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-surface-dark ml-1">Date</label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-surface-dark ml-1">Time</label>
                                <Input
                                    type="text"
                                    placeholder="e.g. 10:00 AM"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark ml-1">Location</label>
                            <Input
                                placeholder="Online or physical address"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                            />
                        </div>

                        <div className="pt-4">
                            <Button type="submit" size="lg" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : "Launch Event"}
                            </Button>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
