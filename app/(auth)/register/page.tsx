"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { auth } from "@/lib/firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { authService } from "@/services/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await authService.createUserProfile(user.uid, {
                email,
                fullName,
                role: "user",
            });
            router.push("/events");
        } catch (err: any) {
            console.error("Registration Error:", err);
            setError(err.code || err.message || "Failed to create account. Please try again.");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen relative flex items-center justify-center bg-background px-4">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[30%] h-[30%] bg-accent/10 rounded-full blur-[100px]" />

            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-surface-dark/60 hover:text-accent font-medium transition-colors">
                <ArrowLeft size={20} /> Back to Home
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                <GlassCard className="p-10">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-black text-surface-dark mb-2">Join NexVenue</h1>
                        <p className="text-surface-dark/60">Create your account to start exploring</p>
                    </div>

                    {error && (
                        <div className="bg-error/10 text-error p-4 rounded-xl text-sm mb-6 border border-error/20">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark ml-1">Full Name</label>
                            <Input
                                type="text"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark ml-1">Email Address</label>
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark ml-1">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" size="lg" className="w-full mt-4" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : "Create Account"}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-surface-dark/60 mt-8">
                        Already have an account?{" "}
                        <Link href="/login" className="text-accent font-bold hover:underline">
                            Log in
                        </Link>
                    </p>
                </GlassCard>
            </motion.div>
        </main>
    );
}
