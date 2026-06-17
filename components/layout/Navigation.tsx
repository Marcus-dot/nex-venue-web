"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";
import { notificationService } from "@/services/notifications";
import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import {
    MessageSquare,
    Home,
    User as UserIcon,
    TrendingUp,
    LogOut,
    Bell,
    ShieldCheck,
    Plus,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export const Navigation = () => {
    const { user, profile, isAdmin } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    if (pathname.startsWith("/qa/") || pathname.startsWith("/e/")) return null;
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = notificationService.subscribeToNotifications(user.uid, (notes) => {
            const unread = notes.filter(n => !n.read).length;
            setUnreadCount(unread);
        });
        return () => unsubscribe();
    }, [user]);

    // Hide nav on public/auth pages
    if (pathname === "/" || pathname === "/login" || pathname === "/register") return null;

    const navItems = [
        { label: "Feed", href: "/events", icon: Home },
        { label: "Messages", href: "/chat", icon: MessageSquare },
        { label: "Profile", href: "/profile", icon: UserIcon },
    ];

    // Admin-only nav item
    if (isAdmin) {
        navItems.splice(1, 0, {
            label: "Dashboard",
            href: "/dashboard",
            icon: TrendingUp,
        });
    }

    const handleSignOut = async () => {
        if (user) {
            await authService.setOnlineStatus(user.uid, false);
        }
        await authService.signOut();
        router.push("/");
    };

    // Display name: prefer fullName, fallback to email prefix or phone
    const displayName =
        profile?.fullName ||
        (user?.email ? user.email.split("@")[0] : null) ||
        (user?.phoneNumber ? user.phoneNumber.slice(-4) : "User");

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-surface-dark/5 dark:border-white/5 px-8 pt-4 pb-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/events" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-black transition-transform group-hover:scale-110">
                        N
                    </div>
                    <span className="text-xl font-black tracking-tighter text-surface-dark dark:text-white">NexVenue</span>
                    {isAdmin && (
                        <span className="hidden sm:flex items-center gap-1 text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={10} /> Admin
                        </span>
                    )}
                </Link>

                <div className="flex items-center gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href}>
                                <button
                                    className={cn(
                                        "px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-bold text-sm text-center",
                                        isActive
                                            ? "bg-accent/10 text-accent"
                                            : "text-surface-dark/40 dark:text-white/40 hover:text-surface-dark dark:hover:text-white hover:bg-surface-dark/5 dark:hover:bg-white/5"
                                    )}
                                >
                                    <item.icon size={18} />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </button>
                            </Link>
                        );
                    })}
                    
                    {/* Create Event Button — Visible to all logged in users */}
                    {user && (
                        <Link href="/events/create">
                            <Button 
                                size="sm" 
                                className="hidden lg:flex items-center gap-2 ml-2 px-5"
                            >
                                <Plus size={18} strokeWidth={3} />
                                <span>Create Event</span>
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            {/* Notifications bell — Phase 3 */}
                            <Link href="/notifications">
                                <button className="relative p-2 rounded-xl text-surface-dark/40 dark:text-white/40 hover:text-surface-dark dark:hover:text-white hover:bg-surface-dark/5 dark:hover:bg-white/5 transition-all">
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-[9px] font-black text-white flex items-center justify-center border-2 border-white dark:border-gray-950 animate-pulse">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                            </Link>

                            <Link href="/profile" className="hidden md:block text-right group">
                                <div className="text-[10px] font-black text-surface-dark/30 dark:text-white/30 uppercase tracking-widest group-hover:text-accent transition-colors">
                                    Logged in as
                                </div>
                                <div className="text-sm font-black text-surface-dark dark:text-white group-hover:text-accent transition-colors">{displayName}</div>
                            </Link>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSignOut}
                                className="font-bold text-surface-dark/40 hover:text-red-500 gap-1.5"
                            >
                                <LogOut size={16} />
                                <span className="hidden sm:inline">Sign Out</span>
                            </Button>
                        </>
                    ) : (
                        <Link href="/login">
                            <Button size="sm" className="font-black">Sign In</Button>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};
