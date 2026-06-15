"use client";

import { ChatMessage } from "@/types/chat";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils/cn";
import { motion } from "framer-motion";

interface MessageItemProps {
    message: ChatMessage;
    isConsecutive?: boolean;
}

export const MessageItem = ({ message, isConsecutive }: MessageItemProps) => {
    const { user } = useAuth();
    const isOwnMessage = message.senderId === user?.uid;

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: isOwnMessage ? 20 : -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className={cn(
                "flex flex-col mb-2",
                isOwnMessage ? "items-end" : "items-start",
                isConsecutive ? "mt-0" : "mt-4"
            )}
        >
            {!isConsecutive && !isOwnMessage && (
                <span className="text-xs font-bold text-surface-dark/40 dark:text-white/40 mb-1 ml-4">
                    {message.senderName}
                </span>
            )}

            <div
                className={cn(
                    "max-w-[70%] px-5 py-3 rounded-2xl shadow-sm relative group",
                    isOwnMessage
                        ? "bg-accent text-white rounded-tr-sm"
                        : "bg-surface-dark/5 dark:bg-white/10 text-surface-dark dark:text-white rounded-tl-sm"
                )}
            >
                <p className="text-sm font-medium leading-relaxed">{message.message}</p>

                <div className={cn(
                    "text-[10px] mt-1 font-bold opacity-0 group-hover:opacity-60 transition-opacity",
                    isOwnMessage ? "text-right" : "text-left"
                )}>
                    {formatTime(message.timestamp)}
                </div>
            </div>
        </motion.div>
    );
};
