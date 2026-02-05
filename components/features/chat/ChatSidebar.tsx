"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { chatService } from "@/services/chat";
import { DirectConversation } from "@/types/chat";
import { GlassCard } from "@/components/ui/GlassCard";
import { MessageSquare, Users, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatSidebarProps {
    onSelect: (id: string, type: 'direct' | 'event', name: string) => void;
    selectedId?: string;
}

export const ChatSidebar = ({ onSelect, selectedId }: ChatSidebarProps) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<DirectConversation[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!user) return;
        return chatService.subscribeToMyConversations(user.uid, setConversations);
    }, [user]);

    const getRecipientInfo = (conv: DirectConversation) => {
        const recipientId = conv.participants.find(p => p !== user?.uid);
        return conv.participantDetails[recipientId!];
    };

    return (
        <div className="w-80 h-full border-r border-surface-dark/5 flex flex-col bg-white">
            <div className="p-6 space-y-4">
                <h2 className="text-2xl font-black text-surface-dark">Messages</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-dark/30" size={16} />
                    <input
                        className="w-full bg-surface-dark/5 border-none rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:ring-2 focus:ring-accent/20 outline-none"
                        placeholder="Search conversations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">
                <div className="text-[10px] uppercase tracking-widest font-black text-surface-dark/30 ml-2 mb-2">Direct Chats</div>

                {conversations.length === 0 && (
                    <div className="text-center py-10 opacity-40">
                        <MessageSquare size={32} className="mx-auto mb-2" />
                        <p className="text-xs font-bold">No conversations yet</p>
                    </div>
                )}

                {conversations.map((conv) => {
                    const info = getRecipientInfo(conv);
                    const isSelected = selectedId === conv.id;

                    return (
                        <button
                            key={conv.id}
                            onClick={() => onSelect(conv.id, 'direct', info.name)}
                            className={cn(
                                "w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left",
                                isSelected ? "bg-accent text-white shadow-lg shadow-accent/20" : "hover:bg-surface-dark/5"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center font-black text-lg",
                                isSelected ? "bg-white/20" : "bg-accent/10 text-accent"
                            )}>
                                {info.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black truncate">{info.name}</div>
                                <div className={cn(
                                    "text-xs truncate",
                                    isSelected ? "text-white/70" : "text-surface-dark/40 font-medium"
                                )}>
                                    {conv.lastMessage}
                                </div>
                            </div>
                            <div className={cn(
                                "text-[10px] font-bold",
                                isSelected ? "text-white/40" : "text-surface-dark/20"
                            )}>
                                {new Date(conv.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};
