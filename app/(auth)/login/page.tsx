"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Phone, Mail, ChevronRight } from "lucide-react";
import { getCleanErrorMessage } from "@/lib/utils/firebaseErrors";

type AuthTab = "phone" | "email";
type PhoneStep = "input" | "verify";

export default function LoginPage() {
    const { sendOtp, confirmationResult, setConfirmationResult, fetchUserProfile } = useAuth();
    const router = useRouter();

    const [tab, setTab] = useState<AuthTab>("phone");
    const [phoneStep, setPhoneStep] = useState<PhoneStep>("input");

    // Phone OTP state
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");

    // Email state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // reCAPTCHA anchor — invisible, required by Firebase phone auth on web
    const recaptchaRef = useRef<HTMLDivElement>(null);

    // Reset phone flow when switching tabs
    useEffect(() => {
        setError("");
        setPhoneStep("input");
        setConfirmationResult(null);
    }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Phone OTP: Step 1 — Send OTP ────────────────────────────────────────
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            // Normalise: ensure + prefix
            const normalised = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
            await sendOtp(normalised, "recaptcha-container");
            setPhoneStep("verify");
        } catch (err: any) {
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
            const uid = result.user.uid;

            // Fetch or create Firestore profile
            const existingProfile = await fetchUserProfile(uid);
            if (!existingProfile) {
                await authService.createUserProfile(uid, {
                    phoneNumber: result.user.phoneNumber || "",
                    profileComplete: false,
                });
                router.push("/profile-setup");
            } else if (!existingProfile.profileComplete) {
                router.push("/profile-setup");
            } else {
                router.push("/events");
            }
        } catch (err: any) {
            console.error("Verify Error:", err);
            setError(getCleanErrorMessage(err, "Verification failed. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    // ── Email / Password: Login ───────────────────────────────────────────────
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await authService.signInWithEmail(email, password);
            router.push("/events");
        } catch (err: any) {
            console.error("Login Error:", err);
            setError(getCleanErrorMessage(err, "Failed to log in. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen relative flex items-center justify-center bg-background dark:bg-[#0f101e] px-4">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />

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

                    {/* Auth Method Tabs */}
                    <div className="flex gap-2 p-1 bg-surface-dark/5 dark:bg-white/5 rounded-xl mb-8">
                        <button
                            onClick={() => setTab("phone")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === "phone"
                                ? "bg-white dark:bg-white/10 text-accent shadow-sm"
                                : "text-surface-dark/40 dark:text-white/40 hover:text-surface-dark dark:hover:text-white"
                                }`}
                        >
                            <Phone size={15} /> Phone OTP
                        </button>
                        <button
                            onClick={() => setTab("email")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === "email"
                                ? "bg-white dark:bg-white/10 text-accent shadow-sm"
                                : "text-surface-dark/40 dark:text-white/40 hover:text-surface-dark dark:hover:text-white"
                                }`}
                        >
                            <Mail size={15} /> Email
                        </button>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="bg-red-500/10 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {/* ── Phone OTP Flow ── */}
                        {tab === "phone" && (
                            <motion.div
                                key="phone"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                            >
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
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setPhoneNumber(e.target.value)
                                                }
                                                required
                                            />
                                            <p className="text-xs text-surface-dark/40 dark:text-white/40 ml-1">
                                                Include country code (e.g. +27 for South Africa)
                                            </p>
                                        </div>
                                        <Button type="submit" size="lg" className="w-full" disabled={loading}>
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
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setOtp(e.target.value)
                                                }
                                                required
                                            />
                                            <p className="text-xs text-surface-dark/40 dark:text-white/40 ml-1">
                                                Sent to {phoneNumber}. Check your SMS.
                                            </p>
                                        </div>
                                        <Button type="submit" size="lg" className="w-full" disabled={loading}>
                                            {loading ? (
                                                <Loader2 className="animate-spin mx-auto" size={24} />
                                            ) : (
                                                "Verify & Sign In"
                                            )}
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => { setPhoneStep("input"); setOtp(""); setError(""); }}
                                            className="w-full text-sm text-surface-dark/40 dark:text-white/40 hover:text-accent font-bold transition-colors"
                                        >
                                            ← Change number
                                        </button>
                                    </form>
                                )}
                            </motion.div>
                        )}

                        {/* ── Email / Password Flow ── */}
                        {tab === "email" && (
                            <motion.div
                                key="email"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <form onSubmit={handleEmailLogin} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">
                                            Email Address
                                        </label>
                                        <Input
                                            type="email"
                                            placeholder="name@example.com"
                                            value={email}
                                            autoComplete="email"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                setEmail(e.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-sm font-bold text-surface-dark dark:text-white">
                                                Password
                                            </label>
                                            <Link
                                                href="#"
                                                className="text-xs font-bold text-accent hover:underline"
                                            >
                                                Forgot password?
                                            </Link>
                                        </div>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            autoComplete="current-password"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                setPassword(e.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <Loader2 className="animate-spin mx-auto" size={24} />
                                        ) : (
                                            "Sign In"
                                        )}
                                    </Button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <p className="text-center text-sm text-surface-dark/60 dark:text-white/60 mt-8">
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="text-accent font-bold hover:underline">
                            Sign up
                        </Link>
                    </p>
                </GlassCard>
            </motion.div>
        </main>
    );
}
