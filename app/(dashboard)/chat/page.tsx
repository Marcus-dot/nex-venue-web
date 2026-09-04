"use client";
import Image from "next/image";

import { Suspense, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatSidebar } from "@/components/features/chat/ChatSidebar";
import { ChatWindow } from "@/components/features/chat/ChatWindow";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function ChatPageInner() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [selectedChat, setSelectedChat] = useState<{
        id: string;
        type: 'direct' | 'event';
        name: string;
    } | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login?redirect=/chat");
        }
    }, [user, loading, router]);

    useEffect(() => {
        const id = searchParams.get("id");
        const type = searchParams.get("type") as 'direct' | 'event';
        const name = searchParams.get("name");

        if (id && type && name) {
            setSelectedChat({ id, type, name });
        }
    }, [searchParams]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="h-screen w-full flex bg-background dark:bg-[#0f101e] pt-[72px]">
            {/* Mobile shows a single pane: the list, or the open conversation. */}
            <div className={cn("h-full shrink-0", selectedChat ? "hidden md:block" : "w-full md:w-auto")}>
                <ChatSidebar
                    onSelect={(id, type, name) => setSelectedChat({ id, type, name })}
                    selectedId={selectedChat?.id}
                />
            </div>

            {selectedChat ? (
                <ChatWindow
                    id={selectedChat.id}
                    type={selectedChat.type}
                    name={selectedChat.name}
                    onBack={() => setSelectedChat(null)}
                />
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-white dark:bg-[#0f101e] px-8 text-center">
                    <div className="w-24 h-24 bg-accent/10 rounded-3xl flex items-center justify-center mb-6">
                        <Image src="/nexvenue-logo.png" alt="NexVenue" width={48} height={48} className="rounded-2xl" />
                    </div>
                    <h2 className="text-2xl font-bold text-surface-dark dark:text-white mb-1">NexVenue Messenger</h2>
                    <p className="font-medium text-surface-dark/55 dark:text-white/45 max-w-xs">
                        Pick a conversation from the left to start chatting, or open an event chat from its page.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        }>
            <ChatPageInner />
        </Suspense>
    );
}
