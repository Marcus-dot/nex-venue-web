"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { chatService } from "@/services/chat";
import { ChatMessage } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { Button } from "@/components/ui/Button";
import { Send, ArrowLeft, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatWindowProps {
    id: string;
    type: 'direct' | 'event';
    name: string;
}

export const ChatWindow = ({ id, type, name }: ChatWindowProps) => {
    const { user, profile } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id || !user) return;

        setLoading(true);
        const unsubscribe = type === 'event'
            ? chatService.subscribeToMessages(id, (data) => {
                setMessages(data);
                setLoading(false);
            })
            : chatService.subscribeToDirectMessages(id, (data) => {
                setMessages(data);
                setLoading(false);
            });

        return unsubscribe;
    }, [id, type, user]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !user || !profile) return;

        const text = inputText;
        setInputText("");

        try {
            if (type === 'event') {
                await chatService.sendMessage(id, user.uid, (profile.fullName as string) || "User", profile.phoneNumber || "", text);
            } else {
                // Find recipient ID from the combined conversation ID
                const recipientId = id.split('_').find(p => p !== user.uid);
                // Note: In real app we'd need recipient full details here, 
                // for now we use name from props and placeholder phone
                await chatService.sendDirectMessage(
                    recipientId!,
                    user.uid,
                    (profile.fullName as string) || "User",
                    profile.phoneNumber || "",
                    name,
                    "",
                    text
                );
            }
        } catch (error) {
            console.error("Failed to send:", error);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative">
            <header className="px-8 py-4 border-b border-surface-dark/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent font-black text-xl">
                        {name[0]}
                    </div>
                    <div>
                        <h3 className="font-black text-surface-dark">{name}</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black text-surface-dark/40 uppercase tracking-widest">Live Connection</span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="text-surface-dark/40">
                    <Info size={20} />
                </Button>
            </header>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-8 py-6 space-y-1"
            >
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p className="text-sm font-bold">Synchronizing messages...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
                        <div className="w-20 h-20 bg-surface-dark/5 rounded-full flex items-center justify-center mb-6">
                            <Send size={40} className="-rotate-45" />
                        </div>
                        <h4 className="text-xl font-black text-surface-dark mb-2">No messages yet</h4>
                        <p className="text-sm font-medium max-w-xs">Start the conversation by sending a message below.</p>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <MessageItem
                            key={msg.id}
                            message={msg}
                            isConsecutive={i > 0 && messages[i - 1].senderId === msg.senderId}
                        />
                    ))
                )}
            </div>

            <footer className="p-6">
                <form onSubmit={handleSend} className="relative">
                    <input
                        className="w-full bg-surface-dark/5 border-none rounded-2xl pl-6 pr-16 py-4 text-sm font-medium focus:ring-2 focus:ring-accent/20 outline-none min-h-[56px]"
                        placeholder={`Message ${name}...`}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="absolute right-2 top-2 w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </footer>
        </div>
    );
};
