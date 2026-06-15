"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { eventService } from "@/services/events";
import { Event, EventParticipant } from "@/types/events";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
    ArrowLeft, 
    Mic, 
    Store, 
    Loader2, 
    Save, 
    User as UserIcon,
    Layout
} from "lucide-react";
import Link from "next/link";

export default function SpecialAccessPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [event, setEvent] = useState<Event | null>(null);
    const [participant, setParticipant] = useState<EventParticipant | null>(null);
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [formData, setFormData] = useState({
        bio: "",
        company: "",
        boothDetails: ""
    });

    useEffect(() => {
        if (!id || !user) return;

        const fetchData = async () => {
            const eventData = await eventService.getEventById(id as string);
            if (!eventData) {
                router.push("/events");
                return;
            }

            const isSpeaker = eventData.speakers?.includes(user.uid);
            const isExhibitor = eventData.exhibitors?.includes(user.uid);

            if (!isSpeaker && !isExhibitor) {
                router.push(`/events/${id}`);
                return;
            }

            const pData = await eventService.getParticipantProfile(id as string, user.uid);
            
            setEvent(eventData);
            setParticipant(pData);
            if (pData) {
                setFormData({
                    bio: pData.bio || "",
                    company: pData.company || "",
                    boothDetails: pData.boothDetails || ""
                });
            }
            setLoading(false);
        };

        fetchData();
    }, [id, user, router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !id) return;
        setSaveLoading(true);
        try {
            await eventService.updateParticipantProfile(id as string, user.uid, formData);
            showToast("Profile updated successfully!", "success");
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast("Failed to update profile.", "error");
        } finally {
            setSaveLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }

    if (!event || !participant) return null;

    const isSpeaker = participant.role === 'speaker';
    const isExhibitor = participant.role === 'exhibitor';

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] px-8 py-12">
            <div className="max-w-3xl mx-auto">
                <Link href={`/events/${id}`} className="flex items-center gap-2 text-surface-dark/60 dark:text-white/60 hover:text-accent font-medium mb-8">
                    <ArrowLeft size={20} /> Back to Event
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-accent/5 flex items-center justify-center text-accent">
                        {isSpeaker ? <Mic size={32} /> : <Store size={32} />}
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-surface-dark dark:text-white tracking-tight">Staff Access</h1>
                        <p className="text-surface-dark/60 dark:text-white/60 font-medium italic">Managing your {participant.role} profile for {event.title}</p>
                    </div>
                </div>

                <GlassCard className="!p-10">
                    <form onSubmit={handleSave} className="space-y-8">
                        <section className="space-y-4">
                            <h3 className="text-xl font-black text-surface-dark dark:text-white flex items-center gap-2">
                                <UserIcon size={22} className="text-accent" /> Public Information
                            </h3>
                            <p className="text-sm text-surface-dark/60 dark:text-white/60 font-medium">This information will be displayed to all attendees on the event page.</p>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Display Name</label>
                                <Input value={participant.displayName} disabled className="bg-surface-dark/5 opacity-70" />
                                <p className="text-[10px] text-surface-dark/30 dark:text-white/30 font-bold uppercase ml-1">Managed via your main profile</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Company / Organization</label>
                                <Input 
                                    placeholder="e.g. NexVenue Inc."
                                    value={formData.company}
                                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                                />
                            </div>

                            {isSpeaker && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Speaker Bio</label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 placeholder:text-surface-dark/30 dark:placeholder:text-white/30 text-surface-dark dark:text-white font-medium min-h-[150px]"
                                        placeholder="Tell attendees about yourself and your expertise..."
                                        value={formData.bio}
                                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                    />
                                </div>
                            )}

                            {isExhibitor && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-surface-dark ml-1 flex items-center gap-2">
                                        <Layout size={18} className="text-accent" /> Booth / Product Details
                                    </label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 placeholder:text-surface-dark/30 dark:placeholder:text-white/30 text-surface-dark dark:text-white font-medium min-h-[150px]"
                                        placeholder="Describe what you are showcasing at your booth..."
                                        value={formData.boothDetails}
                                        onChange={(e) => setFormData({...formData, boothDetails: e.target.value})}
                                    />
                                </div>
                            )}
                        </section>

                        <div className="pt-4 border-t border-surface-dark/5 dark:border-white/5">
                            <Button type="submit" size="lg" className="w-full sm:w-auto min-w-[200px] gap-2 font-black" disabled={saveLoading}>
                                {saveLoading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Updates</>}
                            </Button>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
