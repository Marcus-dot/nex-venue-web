"use client";

import { Suspense, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatSidebar } from "@/components/features/chat/ChatSidebar";
import { ChatWindow } from "@/components/features/chat/ChatWindow";
import { Loader2 } from "lucide-react";

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
            <ChatSidebar
                onSelect={(id, type, name) => setSelectedChat({ id, type, name })}
                selectedId={selectedChat?.id}
            />

            {selectedChat ? (
                <ChatWindow
                    id={selectedChat.id}
                    type={selectedChat.type}
                    name={selectedChat.name}
                />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-950 opacity-20">
                    <div className="w-24 h-24 bg-surface-dark/10 dark:bg-white/10 rounded-full flex items-center justify-center mb-6">
                        <div className="text-4xl font-black dark:text-white">N</div>
                    </div>
                    <h2 className="text-2xl font-black text-surface-dark dark:text-white">NexVenue Messenger</h2>
                    <p className="font-bold">Select a conversation to start chatting</p>
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
