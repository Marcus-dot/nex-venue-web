"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { getCleanErrorMessage } from "@/lib/utils/firebaseErrors";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import InkBackground from "@/components/ui/InkBackground";

type PhoneStep = "input" | "verify";

export default function LoginPage() {
    const { sendOtp, confirmationResult, setConfirmationResult, signInWithGoogle, fetchUserProfile } = useAuth();
    const router = useRouter();

    const [phoneStep, setPhoneStep] = useState<PhoneStep>("input");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");

    // reCAPTCHA anchor — invisible, required by Firebase phone auth on web
    const recaptchaRef = useRef<HTMLDivElement>(null);

    // Route a freshly-authenticated user based on their profile state
    const routeAfterAuth = async (uid: string, seed: Partial<Parameters<typeof authService.createUserProfile>[1]>) => {
        const existing = await fetchUserProfile(uid);
        if (!existing) {
            await authService.createUserProfile(uid, { profileComplete: false, ...seed });
            router.push("/profile-setup");
        } else if (!existing.profileComplete) {
            router.push("/profile-setup");
        } else {
            router.push("/events");
        }
    };

    // ── Phone OTP: Step 1 — Send OTP ────────────────────────────────────────
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const normalised = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
            await sendOtp(normalised, "recaptcha-container");
            setPhoneStep("verify");
        } catch (err) {
            console.error("OTP Error:", err);
            setError(getCleanErrorMessage(err, "Failed to send OTP. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    // ── Phone OTP: Step 2 — Confirm OTP ─────────────────────────────────────
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmationResult) return;
        setError("");
        setLoading(true);
        try {
            const result = await confirmationResult.confirm(otp);
            await routeAfterAuth(result.user.uid, { phoneNumber: result.user.phoneNumber || "" });
        } catch (err) {
            console.error("Verify Error:", err);
            setError(getCleanErrorMessage(err, "Verification failed. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    // ── Google ──────────────────────────────────────────────────────────────
    const handleGoogle = async () => {
        setError("");
        setGoogleLoading(true);
        try {
            const gUser = await signInWithGoogle();
            await routeAfterAuth(gUser.uid, {
                email: gUser.email || "",
                fullName: gUser.displayName || "",
                avatar: gUser.photoURL || null,
            });
        } catch (err) {
            if ((err as { code?: string })?.code === "auth/popup-closed-by-user" || (err as { code?: string })?.code === "auth/cancelled-popup-request") return;
            console.error("Google Error:", err);
            setError(getCleanErrorMessage(err, "Google sign-in failed. Please try again."));
        } finally {
            setGoogleLoading(false);
        }
    };

    const busy = loading || googleLoading;

    return (
        <main className="min-h-screen relative flex items-center justify-center bg-background dark:bg-[#0f101e] px-4">
            <InkBackground />

            {/* Invisible reCAPTCHA anchor — required by Firebase phone auth */}
            <div id="recaptcha-container" ref={recaptchaRef} />

            <Link
                href="/"
                className="absolute top-8 left-8 flex items-center gap-2 text-surface-dark/60 dark:text-white/60 hover:text-accent font-medium transition-colors"
            >
                <ArrowLeft size={20} /> Back to Home
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                <GlassCard className="p-10">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-black text-surface-dark dark:text-white mb-2">Welcome Back</h1>
                        <p className="text-surface-dark/60 dark:text-white/60">Log in to your NexVenue account</p>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="bg-red-500/10 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-500/20">
                            {error}
                        </div>
                    )}

                    {/* ── Phone OTP Flow ── */}
                    {phoneStep === "input" ? (
                        <form onSubmit={handleSendOtp} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">
                                    Phone Number
                                </label>
                                <Input
                                    type="tel"
                                    placeholder="+27 71 234 5678"
                                    value={phoneNumber}
                                    autoComplete="tel"
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
                                    required
                                />
                                <p className="text-xs text-surface-dark/55 dark:text-white/40 ml-1">
                                    Include country code (e.g. +27 for South Africa)
                                </p>
                            </div>
                            <Button type="submit" size="lg" className="w-full" disabled={busy}>
                                {loading ? (
                                    <Loader2 className="animate-spin mx-auto" size={24} />
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Send OTP <ChevronRight size={18} />
                                    </span>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">
                                    Verification Code
                                </label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="123456"
                                    value={otp}
                                    maxLength={6}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)}
                                    required
                                />
                                <p className="text-xs text-surface-dark/55 dark:text-white/40 ml-1">
                                    Sent to {phoneNumber}. Check your SMS.
                                </p>
                            </div>
                            <Button type="submit" size="lg" className="w-full" disabled={busy}>
                                {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : "Verify & Sign In"}
                            </Button>
                            <button
                                type="button"
                                onClick={() => { setPhoneStep("input"); setOtp(""); setError(""); setConfirmationResult(null); }}
                                className="w-full text-sm text-surface-dark/55 dark:text-white/40 hover:text-accent font-bold transition-colors"
                            >
                                ← Change number
                            </button>
                        </form>
                    )}

                    {/* ── Divider ── */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-surface-dark/10 dark:bg-white/10" />
                        <span className="text-xs font-bold text-surface-dark/55 dark:text-white/40">OR</span>
                        <div className="flex-1 h-px bg-surface-dark/10 dark:bg-white/10" />
                    </div>

                    {/* ── Google ── */}
                    <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={busy}
                        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-surface-dark/15 dark:border-white/15 bg-white dark:bg-white/5 text-surface-dark dark:text-white font-bold hover:bg-surface-dark/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        {googleLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <GoogleIcon size={18} /> Continue with Google
                            </>
                        )}
                    </button>

                    <p className="text-center text-sm text-surface-dark/60 dark:text-white/60 mt-8">
                        New to NexVenue?{" "}
                        <Link href="/register" className="text-accent font-bold hover:underline">
                            Create an account
                        </Link>
                    </p>
                </GlassCard>
            </motion.div>
        </main>
    );
}
