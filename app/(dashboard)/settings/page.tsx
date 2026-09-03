"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { GlassCard, Button, Switch } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { blockService, type BlockedUserSummary } from "@/services/block";
import { adminRequestService, type AdminRequest } from "@/services/adminRequests";
import { Loader2, Bell, Moon, Shield, ArrowLeft, Smartphone, Mail, Trash2, KeyRound, Check, Phone, Ban, Clock } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { auth } from "@/lib/firebase/config";
import { ConfirmationResult } from "firebase/auth";
import { Input } from "@/components/ui/Input";

export default function SettingsPage() {
    const { user, profile, isAdmin, updateUserProfile, loading: authLoading, linkGoogle, unlinkGoogle, linkPhone, unlinkPhone, deleteAccount } = useAuth();
    const { showToast } = useToast();
    const { isDark, setTheme } = useTheme();
    const router = useRouter();

    // ── Sign-in methods (linking) ──
    const [googleLinked, setGoogleLinked] = useState(false);
    const [phoneLinked, setPhoneLinked] = useState(false);
    const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
    const [linkingGoogle, setLinkingGoogle] = useState(false);
    const [linkingPhone, setLinkingPhone] = useState(false);
    const [showPhoneLink, setShowPhoneLink] = useState(false);
    const [phoneLinkStep, setPhoneLinkStep] = useState<"input" | "verify">("input");
    const [linkPhoneNumber, setLinkPhoneNumber] = useState("");
    const [linkOtp, setLinkOtp] = useState("");
    const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);

    // ── Admin access request ──
    const [adminRequest, setAdminRequest] = useState<AdminRequest | null | undefined>(undefined);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminReason, setAdminReason] = useState("");
    const [submittingAdmin, setSubmittingAdmin] = useState(false);

    useEffect(() => {
        if (!user || isAdmin) { setAdminRequest(null); return; }
        let active = true;
        adminRequestService.getUserRequest(user.uid)
            .then((r) => { if (active) setAdminRequest(r); })
            .catch(() => { if (active) setAdminRequest(null); });
        return () => { active = false; };
    }, [user, isAdmin]);

    const submitAdminRequest = async () => {
        if (adminReason.trim().length < 20) {
            showToast("Please explain in at least 20 characters why you need admin access.", "error");
            return;
        }
        if (!user || !profile) return;
        setSubmittingAdmin(true);
        try {
            await adminRequestService.createRequest(
                user.uid,
                profile.fullName || "Unknown",
                profile.phoneNumber || "",
                adminReason.trim(),
            );
            const updated = await adminRequestService.getUserRequest(user.uid);
            setAdminRequest(updated);
            setShowAdminModal(false);
            setAdminReason("");
            showToast("Your admin access request has been submitted for review.", "success");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to submit request.", "error");
        } finally {
            setSubmittingAdmin(false);
        }
    };

    const refreshProviders = async () => {
        const current = auth.currentUser;
        if (!current) return;
        try { await current.reload(); } catch { /* ignore */ }
        const providers = auth.currentUser?.providerData ?? [];
        setGoogleLinked(providers.some(p => p.providerId === "google.com"));
        const phone = providers.find(p => p.providerId === "phone");
        setPhoneLinked(!!phone);
        setLinkedPhone(phone?.phoneNumber ?? auth.currentUser?.phoneNumber ?? null);
    };

    useEffect(() => {
        if (user) refreshProviders();
    }, [user]);

    const handleLinkGoogle = async () => {
        setLinkingGoogle(true);
        try {
            await linkGoogle();
            await refreshProviders();
            showToast("Google linked to your account.", "success");
        } catch (err) {
            if ((err as { code?: string })?.code === "auth/popup-closed-by-user" || (err as { code?: string })?.code === "auth/cancelled-popup-request") return;
            if ((err as { code?: string })?.code === "auth/credential-already-in-use") showToast("This Google account is already linked to another account.", "error");
            else showToast("Could not link Google. Please try again.", "error");
        } finally {
            setLinkingGoogle(false);
        }
    };

    const handleUnlinkGoogle = async () => {
        if (!phoneLinked) { showToast("Add a phone number first. You need at least one sign-in method.", "error"); return; }
        setLinkingGoogle(true);
        try {
            await unlinkGoogle();
            await refreshProviders();
            showToast("Google sign-in removed.", "success");
        } catch { showToast("Could not remove Google. Please try again.", "error"); }
        finally { setLinkingGoogle(false); }
    };

    const handleSendPhoneLink = async () => {
        const normalised = linkPhoneNumber.startsWith("+") ? linkPhoneNumber : `+${linkPhoneNumber}`;
        setLinkingPhone(true);
        try {
            const confirmation = await linkPhone(normalised, "recaptcha-link");
            setPhoneConfirmation(confirmation);
            setPhoneLinkStep("verify");
        } catch (err) {
            if ((err as { code?: string })?.code === "auth/credential-already-in-use" || (err as { code?: string })?.code === "auth/account-exists-with-different-credential") showToast("This phone number is already used by another account.", "error");
            else if ((err as { code?: string })?.code === "auth/provider-already-linked") showToast("A phone number is already linked.", "error");
            else showToast("Could not send the code. Please try again.", "error");
        } finally {
            setLinkingPhone(false);
        }
    };

    const handleVerifyPhoneLink = async () => {
        if (!phoneConfirmation) return;
        setLinkingPhone(true);
        try {
            await phoneConfirmation.confirm(linkOtp);
            await refreshProviders();
            setShowPhoneLink(false);
            setPhoneLinkStep("input");
            setLinkPhoneNumber("");
            setLinkOtp("");
            setPhoneConfirmation(null);
            showToast("Phone number linked to your account.", "success");
        } catch (err) {
            if ((err as { code?: string })?.code === "auth/credential-already-in-use") showToast("This phone number is already used by another account.", "error");
            else if ((err as { code?: string })?.code === "auth/invalid-verification-code") showToast("The code you entered is incorrect.", "error");
            else showToast("Could not link the number. Please try again.", "error");
        } finally {
            setLinkingPhone(false);
        }
    };

    const handleUnlinkPhone = async () => {
        if (!googleLinked) { showToast("Link Google first. You need at least one sign-in method.", "error"); return; }
        setLinkingPhone(true);
        try {
            await unlinkPhone();
            await refreshProviders();
            showToast("Phone number removed.", "success");
        } catch { showToast("Could not remove your phone number. Please try again.", "error"); }
        finally { setLinkingPhone(false); }
    };

    const [settings, setSettings] = useState({
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        darkMode: false,
        privateProfile: false,
    });

    // ── Blocked users ──
    const [blocked, setBlocked] = useState<BlockedUserSummary[]>([]);
    const [blockedLoading, setBlockedLoading] = useState(false);
    const [unblocking, setUnblocking] = useState<string | null>(null);

    // ── Account deletion ──
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const uids = profile?.blockedUsers ?? [];
        if (uids.length === 0) { setBlocked([]); return; }
        let active = true;
        setBlockedLoading(true);
        blockService.getBlockedProfiles(uids)
            .then((list) => { if (active) setBlocked(list); })
            .finally(() => { if (active) setBlockedLoading(false); });
        return () => { active = false; };
    }, [profile?.blockedUsers]);

    const handleUnblock = async (uid: string) => {
        if (!user) return;
        setUnblocking(uid);
        try {
            await blockService.unblockUser(user.uid, uid);
            await updateUserProfile({ blockedUsers: (profile?.blockedUsers ?? []).filter((id) => id !== uid) });
            setBlocked((prev) => prev.filter((b) => b.uid !== uid));
            showToast("User unblocked.", "success");
        } catch {
            showToast("Could not unblock. Please try again.", "error");
        } finally {
            setUnblocking(null);
        }
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteAccount();
            setShowDeleteModal(false);
            showToast("Your account has been permanently deleted.", "success");
            router.replace("/");
        } catch (err) {
            const code = (err as { code?: string })?.code;
            if (code === "auth/requires-recent-login") {
                showToast("For security, log out and back in, then delete again.", "error");
            } else {
                showToast("Could not delete account. Please try again.", "error");
            }
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/login");
            return;
        }

        // Fetch settings from profile.settings
        if (profile?.settings) {
            setSettings({
                ...settings,
                ...profile.settings
            });
        }
    }, [user, profile, authLoading, router]);

    const handleToggle = async (key: keyof typeof settings) => {
        // Dark mode is owned by ThemeContext; derive its current value from the
        // live theme (isDark) so the toggle can never drift out of sync with what
        // the user is actually seeing.
        const current = key === 'darkMode' ? isDark : settings[key];
        const newSettings = { ...settings, [key]: !current };
        setSettings(newSettings);

        // Apply dark mode immediately via ThemeContext
        if (key === 'darkMode') {
            setTheme(newSettings.darkMode);
        }

        // Save to profile in background
        if (user) {
            try {
                await updateUserProfile({
                    settings: newSettings
                });
            } catch (error) {
                console.error("Failed to save setting:", error);
                setSettings(settings);
            }
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] px-8 py-12 pt-24">
            {/* Invisible reCAPTCHA anchor, required by Firebase phone auth on web */}
            <div id="recaptcha-link" />
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <Link href="/profile" className="flex items-center gap-2 text-surface-dark/60 dark:text-white/60 hover:text-accent font-medium">
                        <ArrowLeft size={20} /> Back to Profile
                    </Link>
                </div>

                <div>
                    <h1 className="text-4xl font-black text-surface-dark dark:text-white tracking-tighter mb-2">Preferences</h1>
                    <p className="text-surface-dark/60 dark:text-white/60 font-medium">Manage your app experience, notifications, and privacy.</p>
                </div>

                <GlassCard className="!p-8 space-y-8">
                    {/* Notifications */}
                    <div>
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-dark/10 dark:border-white/10">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                <Bell size={20} />
                            </div>
                            <h2 className="text-xl font-black text-surface-dark dark:text-white">Notifications</h2>
                        </div>
                        <div className="space-y-6 pl-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-surface-dark dark:text-white flex items-center gap-2"><Mail size={16} className="text-surface-dark/55" /> Email Updates</h4>
                                    <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50 mt-1">Receive daily digests and important event announcements.</p>
                                </div>
                                <Switch checked={settings.emailNotifications} onCheckedChange={() => handleToggle('emailNotifications')} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-surface-dark dark:text-white flex items-center gap-2"><Smartphone size={16} className="text-surface-dark/55" /> Push Notifications</h4>
                                    <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50 mt-1">Get instant alerts for chat messages and event starts.</p>
                                </div>
                                <Switch checked={settings.pushNotifications} onCheckedChange={() => handleToggle('pushNotifications')} />
                            </div>
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="pt-4">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-dark/10 dark:border-white/10">
                            <div className="w-10 h-10 rounded-xl bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center text-surface-dark dark:text-white">
                                <Moon size={20} />
                            </div>
                            <h2 className="text-xl font-black text-surface-dark dark:text-white">Appearance</h2>
                        </div>
                        <div className="space-y-6 pl-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-surface-dark dark:text-white">Dark Mode Theme</h4>
                                    <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50 mt-1">Switch to a darker interface for low-light environments.</p>
                                </div>
                                <Switch checked={isDark} onCheckedChange={() => handleToggle('darkMode')} />
                            </div>
                        </div>
                    </div>

                    {/* Privacy & Security */}
                    <div className="pt-4">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-dark/10 dark:border-white/10">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Shield size={20} />
                            </div>
                            <h2 className="text-xl font-black text-surface-dark dark:text-white">Privacy & Security</h2>
                        </div>
                        <div className="space-y-6 pl-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-surface-dark dark:text-white">Private Profile</h4>
                                    <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50 mt-1">Hide your profile from the public attendee directory.</p>
                                </div>
                                <Switch checked={settings.privateProfile} onCheckedChange={() => handleToggle('privateProfile')} />
                            </div>

                            {/* Blocked users */}
                            <div className="pt-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <Ban size={16} className="text-surface-dark/55 dark:text-white/40" />
                                    <h4 className="font-bold text-surface-dark dark:text-white">Blocked Users</h4>
                                    {blocked.length > 0 && (
                                        <span className="text-xs font-black text-surface-dark/55 dark:text-white/40">{blocked.length}</span>
                                    )}
                                </div>
                                {blockedLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-surface-dark/55 dark:text-white/40"><Loader2 size={14} className="animate-spin" /> Loading…</div>
                                ) : blocked.length === 0 ? (
                                    <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50">You haven&apos;t blocked anyone. Blocked users can&apos;t message you or send connection requests.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {blocked.map((b) => (
                                            <div key={b.uid} className="flex items-center justify-between gap-3 rounded-xl border border-surface-dark/10 dark:border-white/10 p-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <AvatarDisplay avatarUrl={b.avatar} fullName={b.fullName} size={36} />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-surface-dark dark:text-white truncate">{b.fullName}</p>
                                                        {b.company && <p className="text-xs font-medium text-surface-dark/60 dark:text-white/50 truncate">{b.company}</p>}
                                                    </div>
                                                </div>
                                                <Button variant="ghost" disabled={unblocking === b.uid} onClick={() => handleUnblock(b.uid)} className="text-accent font-bold bg-white dark:bg-white/5 shrink-0">
                                                    {unblocking === b.uid ? <Loader2 className="animate-spin" size={16} /> : "Unblock"}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sign-in Methods */}
                    <div className="pt-4">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-dark/10 dark:border-white/10">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                <KeyRound size={20} />
                            </div>
                            <h2 className="text-xl font-black text-surface-dark dark:text-white">Sign-in Methods</h2>
                        </div>
                        <div className="space-y-4 pl-2">
                            {/* Phone */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center text-accent"><Phone size={18} /></div>
                                    <div>
                                        <h4 className="font-bold text-surface-dark dark:text-white">Phone Number</h4>
                                        <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50">{phoneLinked ? (linkedPhone ?? "Linked") : "Add your phone number as a sign-in option"}</p>
                                    </div>
                                </div>
                                {phoneLinked ? (
                                    <Button variant="ghost" disabled={linkingPhone} onClick={handleUnlinkPhone} className="text-red-600 font-bold bg-white dark:bg-white/5">Remove</Button>
                                ) : (
                                    <Button variant="ghost" disabled={linkingPhone} onClick={() => setShowPhoneLink(v => !v)} className="text-accent font-bold bg-white dark:bg-white/5">{showPhoneLink ? "Cancel" : "Add"}</Button>
                                )}
                            </div>

                            {/* Phone link inline form */}
                            {!phoneLinked && showPhoneLink && (
                                <div className="rounded-xl border border-surface-dark/10 dark:border-white/10 p-4 space-y-3">
                                    {phoneLinkStep === "input" ? (
                                        <>
                                            <Input type="tel" placeholder="+27 71 234 5678" value={linkPhoneNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkPhoneNumber(e.target.value)} />
                                            <p className="text-xs text-surface-dark/55 dark:text-white/40">Include the country code. We&apos;ll text a 6-digit code.</p>
                                            <Button className="w-full" disabled={linkingPhone} onClick={handleSendPhoneLink}>{linkingPhone ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Send Code"}</Button>
                                        </>
                                    ) : (
                                        <>
                                            <Input type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={linkOtp} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkOtp(e.target.value)} />
                                            <Button className="w-full" disabled={linkingPhone} onClick={handleVerifyPhoneLink}>{linkingPhone ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Verify & Link"}</Button>
                                            <button type="button" onClick={() => { setPhoneLinkStep("input"); setLinkOtp(""); }} className="w-full text-sm text-surface-dark/55 dark:text-white/40 hover:text-accent font-bold">← Change number</button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Google */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center"><GoogleIcon size={18} /></div>
                                    <div>
                                        <h4 className="font-bold text-surface-dark dark:text-white flex items-center gap-2">Google {googleLinked && <Check size={14} className="text-green-500" />}</h4>
                                        <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50">{googleLinked ? "Linked" : "Add Google as a sign-in option"}</p>
                                    </div>
                                </div>
                                {googleLinked ? (
                                    <Button variant="ghost" disabled={linkingGoogle} onClick={handleUnlinkGoogle} className="text-red-600 font-bold bg-white dark:bg-white/5">Remove</Button>
                                ) : (
                                    <Button variant="ghost" disabled={linkingGoogle} onClick={handleLinkGoogle} className="text-accent font-bold bg-white dark:bg-white/5">{linkingGoogle ? <Loader2 className="animate-spin" size={18} /> : "Add"}</Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Admin Access (non-admins only) */}
                    {!isAdmin && (
                        <div className="pt-4">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-dark/10 dark:border-white/10">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                    <Shield size={20} />
                                </div>
                                <h2 className="text-xl font-black text-surface-dark dark:text-white">Admin Access</h2>
                            </div>
                            <div className="pl-2">
                                {adminRequest === undefined ? (
                                    <div className="flex items-center gap-2 text-sm text-surface-dark/55 dark:text-white/40"><Loader2 size={14} className="animate-spin" /> Loading…</div>
                                ) : adminRequest?.status === "pending" ? (
                                    <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0"><Clock size={18} /></div>
                                        <div>
                                            <p className="font-bold text-surface-dark dark:text-white">Admin Request Pending</p>
                                            <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50 mt-0.5">Your request is awaiting review.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h4 className="font-bold text-surface-dark dark:text-white">Request Admin Access</h4>
                                            <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50 mt-1">
                                                {adminRequest?.status === "rejected"
                                                    ? "Your previous request was declined. You can re-apply."
                                                    : "Apply for platform admin privileges to manage events and users."}
                                            </p>
                                        </div>
                                        <Button className="font-bold shrink-0" onClick={() => setShowAdminModal(true)}>
                                            {adminRequest?.status === "rejected" ? "Re-apply" : "Request Access"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Danger Zone */}
                    <div className="pt-12">
                        <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
                            <h3 className="font-black text-red-600 flex items-center gap-2">
                                <Trash2 size={20} /> Danger Zone
                            </h3>
                            <p className="text-sm font-medium text-surface-dark/70 dark:text-white/70">
                                Permanently delete your account and all associated data. This action cannot be reversed.
                            </p>
                            <Button variant="ghost" className="text-red-600 hover:bg-red-500/20 font-bold bg-white dark:bg-white/5" onClick={() => setShowDeleteModal(true)}>
                                Delete Account
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Request admin access */}
            <Modal isOpen={showAdminModal} onClose={() => !submittingAdmin && setShowAdminModal(false)} title="Request Admin Access">
                <div className="space-y-5">
                    <p className="text-sm font-medium text-surface-dark/70 dark:text-white/70">
                        Admin access lets you manage events, users, and platform settings. Tell us why you need it, an existing admin will review your request.
                    </p>
                    <div>
                        <textarea
                            value={adminReason}
                            onChange={(e) => setAdminReason(e.target.value)}
                            rows={4}
                            maxLength={500}
                            placeholder="Explain why you need admin access…"
                            className="w-full rounded-xl border border-surface-dark/15 dark:border-white/15 bg-white dark:bg-white/5 p-3 text-sm font-medium text-surface-dark dark:text-white placeholder:text-surface-dark/40 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                        />
                        <p className="text-xs font-medium text-surface-dark/45 dark:text-white/35 mt-1 text-right">{adminReason.trim().length}/20 min</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1 bg-white dark:bg-white/5 font-bold" disabled={submittingAdmin} onClick={() => setShowAdminModal(false)}>
                            Cancel
                        </Button>
                        <Button className="flex-1 font-bold" disabled={submittingAdmin || adminReason.trim().length < 20} onClick={submitAdminRequest}>
                            {submittingAdmin ? <Loader2 className="animate-spin" size={18} /> : "Submit Request"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete account confirmation */}
            <Modal isOpen={showDeleteModal} onClose={() => !deleting && setShowDeleteModal(false)} title="Delete account">
                <div className="space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600 shrink-0"><Trash2 size={18} /></div>
                        <p className="text-sm font-medium text-surface-dark/70 dark:text-white/70">
                            This permanently deletes your account and all associated data. This cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1 bg-white dark:bg-white/5 font-bold" disabled={deleting} onClick={() => setShowDeleteModal(false)}>
                            Cancel
                        </Button>
                        <Button className="flex-1 bg-red-600 hover:bg-red-600/90 shadow-red-600/30 font-bold" disabled={deleting} onClick={confirmDelete}>
                            {deleting ? <Loader2 className="animate-spin" size={18} /> : "Delete Account"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
