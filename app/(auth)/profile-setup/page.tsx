"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { imageUploadService } from "@/services/imageUpload";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Camera, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const GENDER_OPTIONS = [
    { value: "male",              label: "Male" },
    { value: "female",            label: "Female" },
    { value: "other",             label: "Other" },
    { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

type GenderValue = typeof GENDER_OPTIONS[number]["value"];

export default function ProfileSetupPage() {
    const { user, updateUserProfile } = useAuth();
    const router = useRouter();

    const [fullName,      setFullName]      = useState("");
    const [gender,        setGender]        = useState<GenderValue | "">("");
    const [imageFile,     setImageFile]     = useState<File | null>(null);
    const [imagePreview,  setImagePreview]  = useState<string | null>(null);
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState("");

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!fullName.trim()) { setError("Please enter your full name."); return; }
        setError("");
        setLoading(true);
        try {
            let avatar: string | null = null;
            if (imageFile) {
                const path = `avatars/${user.uid}/profile_${Date.now()}`;
                avatar = await imageUploadService.uploadImage(path, imageFile);
            }
            await updateUserProfile({
                fullName: fullName.trim(),
                avatar,
                ...(gender ? { gender } : {}),
                profileComplete: true,
            });
            router.replace("/events");
        } catch (err) {
            console.error("Profile setup error:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-sm">

                {/* Brand mark */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-white font-black text-lg">N</div>
                    <span className="text-xl font-black tracking-tighter text-surface-dark dark:text-white">NexVenue</span>
                </div>

                {/* Heading */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-surface-dark dark:text-white tracking-tight mb-2">
                        Welcome — let's set up<br />your profile
                    </h1>
                    <p className="text-sm text-surface-dark/50 dark:text-white/50 font-medium">
                        Takes less than a minute. You can fill in more details later.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Profile picture */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative group">
                            <div className="ring-4 ring-white dark:ring-[#1e2040] rounded-full shadow-xl shadow-black/10">
                                <AvatarDisplay
                                    avatarUrl={imagePreview}
                                    fullName={fullName || "?"}
                                    size={96}
                                />
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Camera size={20} className="text-white" />
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10 rounded-full"
                                onChange={handleImageChange}
                            />
                            {/* Camera badge */}
                            <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-md cursor-pointer hover:bg-accent/90 transition-colors">
                                <Camera size={14} className="text-white" />
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        </div>
                        <p className="text-xs text-surface-dark/40 dark:text-white/40 font-medium">
                            {imagePreview ? "Looking good!" : "Add a profile picture (optional)"}
                        </p>
                    </div>

                    {/* Full name */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-surface-dark dark:text-white">
                            Full Name <span className="text-accent">*</span>
                        </label>
                        <Input
                            placeholder="e.g. Jane Doe"
                            value={fullName}
                            onChange={(e) => { setFullName(e.target.value); setError(""); }}
                            required
                        />
                    </div>

                    {/* Gender */}
                    <div className="space-y-2.5">
                        <label className="text-sm font-bold text-surface-dark dark:text-white">
                            Gender <span className="text-surface-dark/30 dark:text-white/30 font-medium">(optional)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {GENDER_OPTIONS.map((opt) => {
                                const selected = gender === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setGender(selected ? "" : opt.value)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                                            selected
                                                ? "bg-accent text-white border-accent shadow-sm shadow-accent/30"
                                                : "bg-transparent border-surface-dark/12 dark:border-white/10 text-surface-dark/60 dark:text-white/50 hover:border-accent/40"
                                        )}
                                    >
                                        {selected && <Check size={10} strokeWidth={3} />}
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs font-bold text-red-500">{error}</p>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full h-12 font-black"
                        disabled={loading}
                    >
                        {loading
                            ? <Loader2 className="animate-spin" size={20} />
                            : "Continue to NexVenue →"
                        }
                    </Button>

                    <p className="text-center text-xs text-surface-dark/30 dark:text-white/30 font-medium">
                        You can always update your profile later from settings.
                    </p>
                </form>
            </div>
        </div>
    );
}
