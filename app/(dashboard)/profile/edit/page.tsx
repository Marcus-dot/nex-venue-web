"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { imageUploadService } from "@/services/imageUpload";
import { INDUSTRY_OPTIONS, EVENT_INTEREST_OPTIONS } from "@/types/auth";
import {
    ArrowLeft, Camera, Loader2, Linkedin, Twitter, Globe,
    Briefcase, Tag, Utensils, Shirt, Users, CheckCircle2,
    Phone, ChevronDown, Check, User
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// ── Constants ────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
    { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const DIETARY_OPTIONS = [
    { value: "none", label: "None" },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "vegan", label: "Vegan" },
    { value: "halal", label: "Halal" },
    { value: "kosher", label: "Kosher" },
    { value: "gluten_free", label: "Gluten-free" },
    { value: "other", label: "Other" },
] as const;

const TSHIRT_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const NETWORKING_OPTIONS = [
    { value: "open", label: "Open to networking" },
    { value: "selective", label: "Selective" },
    { value: "not_available", label: "Not available" },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
    step, icon: Icon, title, children,
}: {
    step: string; icon: React.ComponentType<{ size?: number; className?: string }>; title: string; children: React.ReactNode;
}) {
    return (
        <GlassCard className="!p-0 overflow-hidden">
            <div className="flex items-center gap-4 px-7 py-5 border-b border-surface-dark/5 dark:border-white/5">
                <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white text-xs font-black shrink-0">
                    {step}
                </div>
                <div className="flex items-center gap-2">
                    <Icon size={16} className="text-surface-dark/40 dark:text-white/40" />
                    <h2 className="font-black text-surface-dark dark:text-white">{title}</h2>
                </div>
            </div>
            <div className="p-7 space-y-5">{children}</div>
        </GlassCard>
    );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-surface-dark dark:text-white">{children}</label>
            {hint && <span className="text-[11px] text-surface-dark/30 dark:text-white/30 font-medium">{hint}</span>}
        </div>
    );
}

function Chip({
    selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                selected
                    ? "bg-accent text-white border-accent shadow-sm shadow-accent/30"
                    : "bg-transparent border-surface-dark/12 dark:border-white/10 text-surface-dark/60 dark:text-white/50 hover:border-accent/40 hover:text-surface-dark dark:hover:text-white"
            )}
        >
            {selected && <Check size={10} strokeWidth={3} />}
            {children}
        </button>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EditProfilePage() {
    const { user, profile, updateUserProfile, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [showIndustryModal, setShowIndustryModal] = useState(false);

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        gender: "",
        jobTitle: "",
        company: "",
        industry: "",
        bio: "",
        eventInterests: [] as string[],
        dietaryRestrictions: "",
        tshirtSize: "",
        networkingAvailability: "",
        linkedinUrl: "",
        twitterHandle: "",
        websiteUrl: "",
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push("/login"); return; }
        if (!profile) return;
        setForm({
            fullName: profile.fullName || "",
            email: profile.email || "",
            gender: profile.gender || "",
            jobTitle: profile.jobTitle || "",
            company: profile.company || "",
            industry: profile.industry || "",
            bio: profile.bio || "",
            eventInterests: profile.eventInterests || [],
            dietaryRestrictions: profile.dietaryRestrictions || "",
            tshirtSize: profile.tshirtSize || "",
            networkingAvailability: profile.networkingAvailability || "",
            linkedinUrl: profile.linkedinUrl || "",
            twitterHandle: profile.twitterHandle || "",
            websiteUrl: profile.websiteUrl || "",
        });
        if (profile.avatar) setImagePreview(profile.avatar);
        if (profile.coverImage) setCoverPreview(profile.coverImage);
    }, [user, profile, authLoading, router]);

    const set = (key: keyof typeof form, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    const toggleInterest = (interest: string) =>
        setForm((f) => ({
            ...f,
            eventInterests: f.eventInterests.includes(interest)
                ? f.eventInterests.filter((i) => i !== interest)
                : [...f.eventInterests, interest],
        }));

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const validate = (): string | null => {
        if (!form.fullName.trim()) return "Full name is required.";
        if (form.bio.length > 160) return "Bio must be 160 characters or less.";
        if (form.linkedinUrl && !form.linkedinUrl.includes("linkedin.com"))
            return "LinkedIn URL must contain linkedin.com.";
        if (form.websiteUrl && !/^https?:\/\/.+/.test(form.websiteUrl))
            return "Website must start with http:// or https://.";
        return null;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        const err = validate();
        if (err) { showToast(err, "error"); return; }

        setSaving(true);
        try {
            let avatar = profile?.avatar ?? null;
            if (imageFile) {
                const path = `avatars/${user.uid}/profile_${Date.now()}`;
                avatar = await imageUploadService.uploadImage(path, imageFile);
            }

            let coverImage = profile?.coverImage ?? null;
            if (coverFile) {
                const path = `covers/${user.uid}/cover_${Date.now()}`;
                coverImage = await imageUploadService.uploadImage(path, coverFile);
            }

            await updateUserProfile({
                coverImage,
                fullName: form.fullName.trim() || undefined,
                email: form.email.trim() || undefined,
                gender: (form.gender as any) || undefined,
                avatar,
                jobTitle: form.jobTitle.trim() || undefined,
                company: form.company.trim() || undefined,
                industry: form.industry || undefined,
                bio: form.bio.trim() || undefined,
                eventInterests: form.eventInterests.length ? form.eventInterests : undefined,
                dietaryRestrictions: (form.dietaryRestrictions as any) || undefined,
                tshirtSize: (form.tshirtSize as any) || undefined,
                networkingAvailability: (form.networkingAvailability as any) || undefined,
                linkedinUrl: form.linkedinUrl.trim() || undefined,
                twitterHandle: form.twitterHandle.replace(/^@/, "").trim() || undefined,
                websiteUrl: form.websiteUrl.trim() || undefined,
            });

            showToast("Profile updated!", "success");
            router.push("/profile");
        } catch (error) {
            console.error("Save error:", error);
            showToast("Failed to save. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={44} />
            </div>
        );
    }
    if (!user) return null;

    const bioLen = form.bio.length;

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] pt-24 pb-24 px-6">
            <div className="max-w-xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/profile" className="w-9 h-9 rounded-full bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center hover:bg-surface-dark/10 dark:hover:bg-white/10 transition-colors">
                        <ArrowLeft size={16} className="text-surface-dark dark:text-white" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-surface-dark dark:text-white tracking-tight">Edit Profile</h1>
                        <p className="text-xs text-surface-dark/40 dark:text-white/40 font-medium">Your changes are visible to other attendees</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">

                    {/* ── A: Personal Info ────────────────────────────── */}
                    <SectionCard step="A" icon={User} title="Personal Info">

                        {/* Cover image */}
                        <div className="pb-5 border-b border-surface-dark/5 dark:border-white/5">
                            <FieldLabel hint="Optional">Cover Image</FieldLabel>
                            <div className="relative h-28 rounded-2xl overflow-hidden bg-premium-gradient group cursor-pointer">
                                {coverPreview && (
                                    <img src={coverPreview} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-2 text-white text-xs font-black">
                                        <Camera size={15} /> {coverPreview ? "Change cover" : "Add cover photo"}
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    onChange={handleCoverChange}
                                />
                                {!coverPreview && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="flex items-center gap-2 text-white/60 text-xs font-bold">
                                            <Camera size={15} /> Add cover photo
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Profile picture */}
                        <div className="flex items-center gap-5 pb-5 border-b border-surface-dark/5 dark:border-white/5">
                            <div className="relative group cursor-pointer shrink-0">
                                <AvatarDisplay
                                    avatarUrl={imagePreview}
                                    fullName={form.fullName || profile?.fullName}
                                    size={80}
                                    className="shadow-lg"
                                />
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={18} className="text-white" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 rounded-full"
                                    onChange={handleImageChange}
                                />
                            </div>
                            <div>
                                <p className="text-sm font-black text-surface-dark dark:text-white mb-0.5">Profile Picture</p>
                                <p className="text-xs text-surface-dark/40 dark:text-white/40 font-medium mb-2">PNG, JPG up to 5MB</p>
                                <label className="cursor-pointer text-xs font-black text-accent hover:underline underline-offset-2">
                                    Change photo
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                            </div>
                        </div>

                        {/* Full name */}
                        <div>
                            <FieldLabel>Full Name <span className="text-accent ml-0.5">*</span></FieldLabel>
                            <Input placeholder="e.g. Jane Doe" value={form.fullName}
                                onChange={(e) => set("fullName", e.target.value)} required />
                        </div>

                        {/* Email */}
                        <div>
                            <FieldLabel>Email</FieldLabel>
                            <Input type="email" placeholder="e.g. jane@example.com" value={form.email}
                                onChange={(e) => set("email", e.target.value)} />
                        </div>

                        {/* Phone — read only */}
                        <div>
                            <FieldLabel>Phone Number</FieldLabel>
                            <div className="w-full px-5 py-3.5 bg-surface-dark/5 dark:bg-white/5 border border-surface-dark/8 dark:border-white/8 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Phone size={14} className="text-surface-dark/30 dark:text-white/30" />
                                    <span className="text-sm font-medium text-surface-dark dark:text-white">
                                        {profile?.phoneNumber || "—"}
                                    </span>
                                </div>
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-500">
                                    <CheckCircle2 size={11} /> Verified
                                </span>
                            </div>
                        </div>

                        {/* Gender */}
                        <div>
                            <FieldLabel hint="Optional">Gender</FieldLabel>
                            <div className="flex flex-wrap gap-2">
                                {GENDER_OPTIONS.map((opt) => (
                                    <Chip
                                        key={opt.value}
                                        selected={form.gender === opt.value}
                                        onClick={() => set("gender", form.gender === opt.value ? "" : opt.value)}
                                    >
                                        {opt.label}
                                    </Chip>
                                ))}
                            </div>
                        </div>
                    </SectionCard>

                    {/* ── B: Professional Info ────────────────────────── */}
                    <SectionCard step="B" icon={Briefcase} title="Professional Info">

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Job Title</FieldLabel>
                                <Input placeholder="e.g. Designer" value={form.jobTitle}
                                    onChange={(e) => set("jobTitle", e.target.value)} />
                            </div>
                            <div>
                                <FieldLabel>Company</FieldLabel>
                                <Input placeholder="e.g. Acme Corp" value={form.company}
                                    onChange={(e) => set("company", e.target.value)} />
                            </div>
                        </div>

                        {/* Industry */}
                        <div>
                            <FieldLabel>Industry</FieldLabel>
                            <button
                                type="button"
                                onClick={() => setShowIndustryModal(true)}
                                className="w-full px-5 py-3.5 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl flex items-center justify-between hover:border-accent/40 transition-all text-sm"
                            >
                                <span className={form.industry ? "text-surface-dark dark:text-white font-medium" : "text-surface-dark/30 dark:text-white/30"}>
                                    {form.industry || "Select industry…"}
                                </span>
                                <ChevronDown size={16} className="text-surface-dark/30 dark:text-white/30" />
                            </button>
                        </div>

                        {/* Bio */}
                        <div>
                            <FieldLabel hint={`${bioLen}/160`}>Bio</FieldLabel>
                            <textarea
                                className={cn(
                                    "w-full px-5 py-3.5 bg-white/50 dark:bg-white/5 border rounded-xl text-sm font-medium resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-surface-dark/30 dark:placeholder:text-white/30 text-surface-dark dark:text-white",
                                    bioLen > 160 ? "border-red-400 dark:border-red-500" : "border-surface-dark/10 dark:border-white/10"
                                )}
                                placeholder="A short intro about yourself…"
                                value={form.bio}
                                onChange={(e) => set("bio", e.target.value)}
                                maxLength={180}
                            />
                        </div>
                    </SectionCard>

                    {/* ── C: Event Preferences ────────────────────────── */}
                    <SectionCard step="C" icon={Tag} title="Event Preferences">

                        {/* Interests */}
                        <div>
                            <FieldLabel hint="Select all that apply">Interests</FieldLabel>
                            <div className="flex flex-wrap gap-2">
                                {EVENT_INTEREST_OPTIONS.map((interest) => (
                                    <Chip
                                        key={interest}
                                        selected={form.eventInterests.includes(interest)}
                                        onClick={() => toggleInterest(interest)}
                                    >
                                        {interest}
                                    </Chip>
                                ))}
                            </div>
                        </div>

                        {/* Dietary */}
                        <div>
                            <FieldLabel hint="Optional">
                                <span className="flex items-center gap-1.5"><Utensils size={13} className="text-accent" /> Dietary Restrictions</span>
                            </FieldLabel>
                            <div className="flex flex-wrap gap-2">
                                {DIETARY_OPTIONS.map((opt) => (
                                    <Chip
                                        key={opt.value}
                                        selected={form.dietaryRestrictions === opt.value}
                                        onClick={() => set("dietaryRestrictions", form.dietaryRestrictions === opt.value ? "" : opt.value)}
                                    >
                                        {opt.label}
                                    </Chip>
                                ))}
                            </div>
                        </div>

                        {/* T-shirt */}
                        <div>
                            <FieldLabel hint="Optional">
                                <span className="flex items-center gap-1.5"><Shirt size={13} className="text-accent" /> T-Shirt Size</span>
                            </FieldLabel>
                            <div className="flex flex-wrap gap-2">
                                {TSHIRT_OPTIONS.map((size) => (
                                    <Chip
                                        key={size}
                                        selected={form.tshirtSize === size}
                                        onClick={() => set("tshirtSize", form.tshirtSize === size ? "" : size)}
                                    >
                                        {size}
                                    </Chip>
                                ))}
                            </div>
                        </div>

                        {/* Networking */}
                        <div>
                            <FieldLabel hint="Shown on your attendee card">
                                <span className="flex items-center gap-1.5"><Users size={13} className="text-accent" /> Networking</span>
                            </FieldLabel>
                            <div className="flex flex-wrap gap-2">
                                {NETWORKING_OPTIONS.map((opt) => (
                                    <Chip
                                        key={opt.value}
                                        selected={form.networkingAvailability === opt.value}
                                        onClick={() => set("networkingAvailability", form.networkingAvailability === opt.value ? "" : opt.value)}
                                    >
                                        {opt.label}
                                    </Chip>
                                ))}
                            </div>
                        </div>
                    </SectionCard>

                    {/* ── D: Social Links ─────────────────────────────── */}
                    <SectionCard step="D" icon={Globe} title="Social Links">

                        <div>
                            <FieldLabel>
                                <span className="flex items-center gap-1.5"><Linkedin size={13} className="text-[#0077b5]" /> LinkedIn</span>
                            </FieldLabel>
                            <Input type="url" placeholder="https://linkedin.com/in/yourname"
                                value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} />
                        </div>

                        <div>
                            <FieldLabel>
                                <span className="flex items-center gap-1.5"><Twitter size={13} className="text-[#1DA1F2]" /> Twitter / X</span>
                            </FieldLabel>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-dark/40 dark:text-white/40 font-bold text-sm select-none pointer-events-none">@</span>
                                <input
                                    className="w-full pl-8 pr-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl text-sm font-medium text-surface-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-surface-dark/30 dark:placeholder:text-white/30"
                                    placeholder="yourhandle"
                                    value={form.twitterHandle.replace(/^@/, "")}
                                    onChange={(e) => set("twitterHandle", e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <FieldLabel>
                                <span className="flex items-center gap-1.5"><Globe size={13} className="text-accent" /> Website</span>
                            </FieldLabel>
                            <Input type="url" placeholder="https://yourwebsite.com"
                                value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} />
                        </div>
                    </SectionCard>

                    {/* Save */}
                    <Button type="submit" size="lg" className="w-full h-13 font-black text-base" disabled={saving}>
                        {saving ? <Loader2 className="animate-spin" size={20} /> : "Save Changes"}
                    </Button>
                </form>
            </div>

            {/* Industry Picker Modal */}
            <Modal isOpen={showIndustryModal} onClose={() => setShowIndustryModal(false)} title="Select Industry">
                <div className="space-y-0.5 max-h-72 overflow-y-auto -mx-2">
                    {INDUSTRY_OPTIONS.map((industry) => (
                        <button
                            key={industry}
                            type="button"
                            onClick={() => { set("industry", industry); setShowIndustryModal(false); }}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between",
                                form.industry === industry
                                    ? "bg-accent/10 text-accent"
                                    : "hover:bg-surface-dark/5 dark:hover:bg-white/5 text-surface-dark dark:text-white"
                            )}
                        >
                            {industry}
                            {form.industry === industry && <Check size={14} className="text-accent" />}
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
