"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Calendar, Loader2, Image as ImageIcon } from "lucide-react";
import { addDoc } from "firebase/firestore";
import { eventService } from "@/services/events";
import { imageUploadService } from "@/services/imageUpload";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import Link from "next/link";

export default function CreateEventPage() {
    const { user, profile, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            let imageUrl = undefined;
            if (imageFile) {
                // Generate a temporary ID or use timestamp for the image path since we don't have the doc ID yet
                // Alternatively, create doc first, upload, then update doc. Here we use timestamp.
                const imagePath = `events/temp_${Date.now()}_${imageFile.name}`;
                imageUrl = await imageUploadService.uploadImage(imagePath, imageFile);
            }

            const docId = await eventService.createEvent({
                ...formData,
                imageUrl,
                creatorId: user.uid,
                creatorName: profile?.fullName || user.email?.split('@')[0] || "Organizer",
            });

            // If we uploaded an image with a temp path, it's fine for now. 
            // A more robust way is to create doc -> upload with docId -> update doc.

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
        <div className="min-h-screen bg-background dark:bg-[#0f101e] px-8 py-12">
            <div className="max-w-2xl mx-auto">
                <Link href="/events" className="flex items-center gap-2 text-surface-dark/60 dark:text-white/60 hover:text-accent font-medium mb-8">
                    <ArrowLeft size={20} /> Back to Feed
                </Link>

                <h1 className="text-4xl font-black text-surface-dark dark:text-white mb-4">Host an Event</h1>
                <p className="text-surface-dark/60 dark:text-white/60 mb-12">Fill in the details to create your amazing event experience.</p>

                <GlassCard>
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Event Banner Image</label>
                            <div className="relative w-full h-48 bg-surface-dark/5 dark:bg-white/5 border-2 border-dashed border-surface-dark/20 dark:border-white/20 rounded-xl overflow-hidden group hover:border-accent/50 transition-colors flex items-center justify-center cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleImageChange}
                                />
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-surface-dark/40 dark:text-white/40 group-hover:text-accent transition-colors">
                                        <ImageIcon size={32} />
                                        <span className="text-sm font-bold">Click to upload banner image</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Event Title</label>
                            <Input
                                placeholder="e.g. NexVenue Future Tech Expo"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Description</label>
                            <textarea
                                className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 placeholder:text-surface-dark/30 dark:placeholder:text-white/30 text-surface-dark dark:text-white font-medium min-h-[120px]"
                                placeholder="What is your event about?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <DatePicker
                                label="Date"
                                value={formData.date}
                                onChange={(date) => setFormData({ ...formData, date })}
                            />
                            <TimePicker
                                label="Time"
                                value={formData.time}
                                onChange={(time) => setFormData({ ...formData, time })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Location</label>
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
