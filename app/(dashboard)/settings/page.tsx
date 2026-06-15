"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { GlassCard, Button, Switch } from "@/components/ui";
import { Loader2, Bell, Moon, Shield, ArrowLeft, Smartphone, Mail, Trash2 } from "lucide-react";
import Link from "next/link";
import { authService } from "@/services/auth";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";

export default function SettingsPage() {
    const { user, profile, updateUserProfile, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const { setTheme } = useTheme();
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    const [settings, setSettings] = useState({
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        darkMode: false,
        privateProfile: false,
    });

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
        const newSettings = { ...settings, [key]: !settings[key] };
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
                                    <h4 className="font-bold text-surface-dark dark:text-white flex items-center gap-2"><Mail size={16} className="text-surface-dark/40" /> Email Updates</h4>
                                    <p className="text-sm font-medium text-surface-dark/50 dark:text-white/50 mt-1">Receive daily digests and important event announcements.</p>
                                </div>
                                <Switch checked={settings.emailNotifications} onCheckedChange={() => handleToggle('emailNotifications')} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-surface-dark dark:text-white flex items-center gap-2"><Smartphone size={16} className="text-surface-dark/40" /> Push Notifications</h4>
                                    <p className="text-sm font-medium text-surface-dark/50 dark:text-white/50 mt-1">Get instant alerts for chat messages and event starts.</p>
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
                                    <p className="text-sm font-medium text-surface-dark/50 dark:text-white/50 mt-1">Switch to a darker interface for low-light environments.</p>
                                </div>
                                <Switch checked={settings.darkMode} onCheckedChange={() => handleToggle('darkMode')} />
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
                                    <p className="text-sm font-medium text-surface-dark/50 dark:text-white/50 mt-1">Hide your profile from the public attendee directory.</p>
                                </div>
                                <Switch checked={settings.privateProfile} onCheckedChange={() => handleToggle('privateProfile')} />
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-12">
                        <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
                            <h3 className="font-black text-red-600 flex items-center gap-2">
                                <Trash2 size={20} /> Danger Zone
                            </h3>
                            <p className="text-sm font-medium text-surface-dark/70 dark:text-white/70">
                                Permanently delete your account and all associated data. This action cannot be reversed.
                            </p>
                            <Button variant="ghost" className="text-red-600 hover:bg-red-500/20 font-bold bg-white dark:bg-white/5" onClick={() => showToast("Contact support to delete your account.", "info")}>
                                Delete Account
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
