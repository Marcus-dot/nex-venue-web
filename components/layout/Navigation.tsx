"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import {
    MessageSquare,
    Calendar,
    Home,
    User as UserIcon,
    PlusCircle,
    TrendingUp
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export const Navigation = () => {
    const { user } = useAuth();
    const pathname = usePathname();

    if (pathname === "/" || pathname === "/login" || pathname === "/register") return null;

    const navItems = [
        { label: "Feed", href: "/events", icon: Home },
        { label: "Dashboard", href: "/dashboard", icon: TrendingUp },
        { label: "Messages", href: "/chat", icon: MessageSquare },
        { label: "Profile", href: "/profile", icon: UserIcon },
    ];

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-surface-dark/5 px-8 pt-4 pb-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-black transition-transform group-hover:scale-110">N</div>
                    <span className="text-xl font-black tracking-tighter text-surface-dark">NexVenue</span>
                </Link>

                <div className="flex items-center gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href}>
                                <button className={cn(
                                    "px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-bold text-sm",
                                    isActive
                                        ? "bg-accent/10 text-accent"
                                        : "text-surface-dark/40 hover:text-surface-dark hover:bg-surface-dark/5"
                                )}>
                                    <item.icon size={18} />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </button>
                            </Link>
                        )
                    })}
                </div>

                <div className="flex items-center gap-4">
                    {user && (
                        <div className="hidden md:block">
                            <div className="text-[10px] font-black text-surface-dark/30 uppercase tracking-widest text-right">Logged in as</div>
                            <div className="text-sm font-black text-surface-dark">{user.email?.split('@')[0]}</div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};
