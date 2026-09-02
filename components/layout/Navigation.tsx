"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";
import { notificationService } from "@/services/notifications";
import { Button } from "@/components/ui/Button";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { PoweredByGralix } from "@/components/ui/PoweredByGralix";
import { useState, useEffect, useRef } from "react";
import {
    MessageSquare,
    Home,
    User as UserIcon,
    TrendingUp,
    LogOut,
    Bell,
    Plus,
    Settings,
    ChevronDown,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export const Navigation = () => {
    const { user, profile, isAdmin } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const [unreadCount, setUnreadCount] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = notificationService.subscribeToNotifications(user.uid, (notes) => {
            setUnreadCount(notes.filter((n) => !n.read).length);
        });
        return () => unsubscribe();
    }, [user]);

    // Close the account menu on outside click / route change.
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    useEffect(() => { setMenuOpen(false); }, [pathname]);

    // Hide nav on public / auth / projection pages.
    if (pathname.startsWith("/qa/") || pathname.startsWith("/e/")) return null;
    if (pathname === "/" || pathname === "/login" || pathname === "/register") return null;

    const navItems = [
        { label: "Feed", href: "/events", icon: Home },
        { label: "Messages", href: "/chat", icon: MessageSquare },
        { label: "Profile", href: "/profile", icon: UserIcon },
    ];
    if (isAdmin) {
        navItems.splice(1, 0, { label: "Dashboard", href: "/dashboard", icon: TrendingUp });
    }

    const handleSignOut = async () => {
        if (user) await authService.setOnlineStatus(user.uid, false);
        await authService.signOut();
        router.push("/");
    };

    const displayName =
        profile?.fullName ||
        (user?.email ? user.email.split("@")[0] : null) ||
        (user?.phoneNumber ? user.phoneNumber.slice(-4) : "User");
    const roleLabel = isAdmin ? "Administrator" : (profile?.company || profile?.jobTitle || "Attendee");

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-b border-surface-dark/5 dark:border-white/5 px-6 py-3 print:hidden">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                {/* Brand */}
                <Link href="/events" className="flex items-center gap-2 group shrink-0">
                    <Image src="/nexvenue-logo.png" alt="NexVenue" width={32} height={32} className="rounded-lg transition-transform group-hover:scale-105" />
                    <span className="text-xl font-black tracking-tighter text-surface-dark dark:text-white hidden sm:inline">NexVenue</span>
                </Link>

                {/* Primary nav, app items only for signed-in users */}
                {user && (
                    <div className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link key={item.href} href={item.href}>
                                    <span
                                        className={cn(
                                            "px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all font-bold text-sm",
                                            isActive
                                                ? "bg-accent/10 text-accent"
                                                : "text-surface-dark/45 dark:text-white/45 hover:text-surface-dark dark:hover:text-white hover:bg-surface-dark/5 dark:hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon size={18} />
                                        <span className="hidden md:inline">{item.label}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Actions + account */}
                <div className="flex items-center gap-2 shrink-0">
                    {user ? (
                        <>
                            <Link href="/events/create" className="hidden lg:block">
                                <Button size="sm" className="flex items-center gap-2 px-4">
                                    <Plus size={18} strokeWidth={3} /> <span>Create Event</span>
                                </Button>
                            </Link>

                            {/* Create (compact, small screens) */}
                            <Link href="/events/create" className="lg:hidden">
                                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent text-white transition-transform active:scale-95">
                                    <Plus size={18} strokeWidth={3} />
                                </span>
                            </Link>

                            {/* Notifications */}
                            <Link href="/notifications">
                                <span className="relative flex items-center justify-center w-9 h-9 rounded-xl text-surface-dark/45 dark:text-white/45 hover:text-surface-dark dark:hover:text-white hover:bg-surface-dark/5 dark:hover:bg-white/5 transition-all">
                                    <Bell size={19} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-error text-[9px] font-black text-white flex items-center justify-center border-2 border-white dark:border-gray-950">
                                            {unreadCount > 9 ? "9+" : unreadCount}
                                        </span>
                                    )}
                                </span>
                            </Link>

                            {/* Account menu */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setMenuOpen((v) => !v)}
                                    className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-surface-dark/5 dark:hover:bg-white/5 transition-colors"
                                    aria-label="Account menu"
                                >
                                    <AvatarDisplay avatarUrl={profile?.avatar ?? null} fullName={displayName} size={34} />
                                    <ChevronDown size={15} className={cn("text-surface-dark/55 dark:text-white/40 transition-transform", menuOpen && "rotate-180")} />
                                </button>

                                {menuOpen && (
                                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-[#171a2e] deep-shadow border border-surface-dark/5 dark:border-white/10 overflow-hidden py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="px-4 py-3 flex items-center gap-3 border-b border-surface-dark/5 dark:border-white/5">
                                            <AvatarDisplay avatarUrl={profile?.avatar ?? null} fullName={displayName} size={42} />
                                            <div className="min-w-0">
                                                <div className="font-black text-surface-dark dark:text-white truncate leading-tight">{displayName}</div>
                                                <div className="text-xs font-medium text-surface-dark/45 dark:text-white/45 truncate">{roleLabel}</div>
                                            </div>
                                        </div>

                                        <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-surface-dark/70 dark:text-white/70 hover:bg-surface-dark/5 dark:hover:bg-white/5 transition-colors">
                                            <UserIcon size={16} /> Profile
                                        </Link>
                                        <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-surface-dark/70 dark:text-white/70 hover:bg-surface-dark/5 dark:hover:bg-white/5 transition-colors">
                                            <Settings size={16} /> Settings
                                        </Link>

                                        <div className="my-1 border-t border-surface-dark/5 dark:border-white/5" />

                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-500/10 transition-colors"
                                        >
                                            <LogOut size={16} /> Sign out
                                        </button>

                                        <div className="mt-1 px-4 py-3 border-t border-surface-dark/5 dark:border-white/5 flex justify-center">
                                            <PoweredByGralix />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" size="sm" className="font-bold">Sign In</Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm" className="font-black">Join Now</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};
