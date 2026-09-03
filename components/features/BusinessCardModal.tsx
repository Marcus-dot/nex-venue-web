"use client";

import { QRCodeSVG } from "qrcode.react";
import { Phone, Mail, Linkedin, Twitter, Globe, Share2, Check } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import type { UserProfile } from "@/types/auth";

interface BusinessCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    uid: string;
}

/**
 * Shareable business card for the signed-in user. The QR encodes the raw uid,
 * matching the mobile business card, so the NexVenue app's card scanner resolves
 * it to this profile.
 */
export const BusinessCardModal = ({ isOpen, onClose, profile, uid }: BusinessCardModalProps) => {
    const [copied, setCopied] = useState(false);

    const roleLine = profile.jobTitle
        ? `${profile.jobTitle}${profile.company ? ` @ ${profile.company}` : ""}`
        : profile.company ?? "";

    const contacts: { icon: typeof Phone; label: string; href?: string }[] = [];
    if (profile.phoneNumber) contacts.push({ icon: Phone, label: profile.phoneNumber, href: `tel:${profile.phoneNumber}` });
    if (profile.email) contacts.push({ icon: Mail, label: profile.email, href: `mailto:${profile.email}` });
    if (profile.linkedinUrl) contacts.push({ icon: Linkedin, label: profile.linkedinUrl.replace(/^.*linkedin\.com\/in\//i, "linkedin.com/in/"), href: profile.linkedinUrl });
    if (profile.twitterHandle) contacts.push({ icon: Twitter, label: `@${profile.twitterHandle.replace("@", "")}`, href: `https://twitter.com/${profile.twitterHandle.replace("@", "")}` });
    if (profile.websiteUrl) contacts.push({ icon: Globe, label: profile.websiteUrl.replace(/^https?:\/\//, ""), href: profile.websiteUrl });

    const buildText = () => {
        const lines: string[] = [profile.fullName || "NexVenue member"];
        if (roleLine) lines.push(roleLine);
        if (profile.phoneNumber) lines.push(`Phone: ${profile.phoneNumber}`);
        if (profile.email) lines.push(`Email: ${profile.email}`);
        if (profile.linkedinUrl) lines.push(`LinkedIn: ${profile.linkedinUrl}`);
        if (profile.websiteUrl) lines.push(`Website: ${profile.websiteUrl}`);
        lines.push("\nShared via NexVenue");
        return lines.join("\n");
    };

    const handleShare = async () => {
        const text = buildText();
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({ title: profile.fullName || "My NexVenue card", text });
                return;
            } catch {
                // user cancelled or share failed, fall through to copy
            }
        }
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Business Card">
            <div className="space-y-6">
                {/* Card */}
                <div className="rounded-2xl border border-surface-dark/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                    <div className="flex items-center gap-4">
                        <AvatarDisplay avatarUrl={profile.avatar} fullName={profile.fullName || ""} size={56} />
                        <div className="min-w-0">
                            <p className="font-black text-lg text-surface-dark dark:text-white truncate">{profile.fullName || "NexVenue member"}</p>
                            {roleLine && <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50 truncate">{roleLine}</p>}
                        </div>
                    </div>
                    {contacts.length > 0 && (
                        <div className="mt-4 space-y-2 border-t border-surface-dark/10 dark:border-white/10 pt-4">
                            {contacts.map((c) => (
                                <a
                                    key={c.label}
                                    href={c.href}
                                    target={c.href?.startsWith("http") ? "_blank" : undefined}
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm font-medium text-surface-dark/75 dark:text-white/70 hover:text-accent transition-colors"
                                >
                                    <c.icon size={15} className="text-surface-dark/45 dark:text-white/40 shrink-0" />
                                    <span className="truncate">{c.label}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* QR */}
                <div className="flex flex-col items-center rounded-2xl border border-surface-dark/10 dark:border-white/10 bg-surface-secondary/50 dark:bg-white/[0.03] py-6">
                    <p className="text-xs font-black tracking-wide text-surface-dark/55 dark:text-white/40 mb-4">SCAN TO CONNECT</p>
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <QRCodeSVG value={uid} size={180} bgColor="#ffffff" fgColor="#111827" level="M" />
                    </div>
                    <p className="text-xs font-medium text-surface-dark/45 dark:text-white/35 mt-4">Ask someone to scan this with the NexVenue app</p>
                </div>

                {/* Share */}
                <button
                    onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 text-accent font-bold py-3 hover:bg-accent/15 transition-colors"
                >
                    {copied ? <><Check size={16} /> Copied to clipboard</> : <><Share2 size={16} /> Share Card</>}
                </button>
            </div>
        </Modal>
    );
};
