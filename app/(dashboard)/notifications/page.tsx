"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { notificationService } from "@/services/notifications";
import { AppNotification } from "@/types/notifications";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Loader2, Bell, MessageSquare, Calendar, ShieldAlert, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
            return;
        }

        if (user) {
            const unsubscribe = notificationService.subscribeToNotifications(user.uid, (data) => {
                setNotifications(data);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user, authLoading, router]);

    const handleMarkAsRead = async (id: string, read: boolean) => {
        if (!read) {
            await notificationService.markAsRead(id);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (user) {
            await notificationService.markAllAsRead(user.uid);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await notificationService.deleteNotification(id);
    };

    const handleNotificationClick = (notification: AppNotification) => {
        if (!notification.read) {
            notificationService.markAsRead(notification.id);
        }
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'chat_message': return <MessageSquare size={18} className="text-blue-500" />;
            case 'event_invite': return <Calendar size={18} className="text-green-500" />;
            case 'event_update': return <Calendar size={18} className="text-accent" />;
            case 'system_alert': return <ShieldAlert size={18} className="text-red-500" />;
            default: return <Bell size={18} className="text-surface-dark/40" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'chat_message': return 'bg-blue-500/10';
            case 'event_invite': return 'bg-green-500/10';
            case 'event_update': return 'bg-accent/10';
            case 'system_alert': return 'bg-red-500/10';
            default: return 'bg-surface-dark/5';
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] px-8 py-12 pt-24">
            <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-surface-dark dark:text-white tracking-tighter flex items-center gap-3">
                            Notifications 
                            {unreadCount > 0 && <span className="text-accent text-2xl">• {unreadCount} new</span>}
                        </h1>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="gap-2 shrink-0">
                            <CheckCheck size={16} /> Mark all as read
                        </Button>
                    )}
                </div>

                {/* Simulated Generator Buttons */}
                <div className="flex flex-wrap gap-2 mb-8 p-4 border border-blue-500/20 bg-blue-500/5 rounded-2xl">
                    <span className="text-xs font-bold text-blue-800 w-full mb-1">Testing Utilities:</span>
                    <Button variant="secondary" size="sm" onClick={() => notificationService.createMockNotification(user!.uid, "New schedule available", "The agenda for Web3 Summit has been updated.", "/events")}>Event Update</Button>
                    <Button variant="secondary" size="sm" onClick={() => notificationService.createMockNotification(user!.uid, "New message from Sarah", "Are we still on for the networking lunch?", "/chat")}>Chat Msg</Button>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <GlassCard className="py-20 text-center text-surface-dark/40 dark:text-white/40 font-bold border-2 border-dashed border-surface-dark/10 dark:border-white/10">
                            <Bell size={48} className="mx-auto mb-4 opacity-20" />
                            You're all caught up!
                        </GlassCard>
                    ) : (
                        notifications.map((notification) => (
                            <GlassCard
                                key={notification.id}
                                className={cn(
                                    "!p-0 overflow-hidden cursor-pointer transition-all hover:translate-x-1",
                                    !notification.read ? "border-l-4 border-l-accent bg-white/80 dark:bg-white/5 border-t border-r border-b border-white dark:border-white/10" : ""
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="p-5 flex items-start gap-4">
                                    <div className={cn("w-10 h-10 shrink-0 rounded-full flex items-center justify-center", getBgColor(notification.type))}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className={cn("text-base truncate", !notification.read ? "font-black text-surface-dark dark:text-white" : "font-bold text-surface-dark/70 dark:text-white/70")}>
                                                {notification.title}
                                            </h4>
                                            <div className="text-[10px] font-black uppercase text-surface-dark/30 dark:text-white/30 whitespace-nowrap pt-1">
                                                {new Date(notification.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <p className={cn("text-sm line-clamp-2", !notification.read ? "font-bold text-surface-dark/80 dark:text-white/80" : "font-medium text-surface-dark/50 dark:text-white/50")}>
                                            {notification.body}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        {!notification.read && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse mt-2" />
                                        )}
                                        <button 
                                            onClick={(e) => handleDelete(e, notification.id)}
                                            className="p-1.5 mt-auto text-surface-dark/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete notification"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
