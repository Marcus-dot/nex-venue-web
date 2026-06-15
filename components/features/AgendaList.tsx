import React, { useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, ChevronRight, CheckCircle2, Layers } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { agendaService } from "@/services/agenda";
import { AgendaItem } from "@/types/agenda";
import { GlassCard } from "@/components/ui/GlassCard";
import { CATEGORY_CONFIG, CategoryKey } from "@/lib/constants/agenda";

interface AgendaListProps {
    items: AgendaItem[];
    currentId?: string;
}

export const AgendaList = ({ items, currentId }: AgendaListProps) => {
    const { user } = useAuth();
    const [selectingId, setSelectingId] = useState<string | null>(null);

    const getCategoryStyles = (category?: string) => {
        const config = CATEGORY_CONFIG[category as CategoryKey] || CATEGORY_CONFIG.other;
        return {
            icon: <config.icon size={14} />,
            color: config.color,
            bg: config.bg,
            border: config.border,
            label: config.label
        };
    };

    const handleSelectSession = async (item: AgendaItem) => {
        if (!user || !item.simultaneousGroupId) return;
        setSelectingId(item.id);
        try {
            await agendaService.selectSimultaneousEvent(
                item.eventId,
                item.id,
                user.uid,
                item.simultaneousGroupId
            );
        } catch (error) {
            console.error("Error selecting session:", error);
        } finally {
            setSelectingId(null);
        }
    };

    if (items.length === 0) {
        return (
            <div className="py-12 text-center text-surface-dark/40 dark:text-white/40 border-2 border-dashed border-surface-dark/5 dark:border-white/5 rounded-3xl font-medium">
                The agenda hasn't been posted yet. Check back soon!
            </div>
        );
    }

    // Grouping logic: Collect items by time and groupId
    const groupedItems: (AgendaItem | AgendaItem[])[] = [];
    const processedGroupIds = new Set<string>();

    items.forEach((item) => {
        if (item.simultaneousGroupId) {
            if (processedGroupIds.has(item.simultaneousGroupId)) return;
            
            const group = items.filter(i => i.simultaneousGroupId === item.simultaneousGroupId);
            groupedItems.push(group);
            processedGroupIds.add(item.simultaneousGroupId);
        } else {
            groupedItems.push(item);
        }
    });

    return (
        <div className="space-y-6">
            {groupedItems.map((groupOrItem, idx) => {
                const isGroup = Array.isArray(groupOrItem);
                const firstItem = isGroup ? groupOrItem[0] : groupOrItem;
                const isLive = isGroup 
                    ? groupOrItem.some(i => i.id === currentId)
                    : groupOrItem.id === currentId;

                return (
                    <motion.div
                        key={isGroup ? `group-${firstItem.simultaneousGroupId}` : firstItem.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        {isGroup ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-6 py-2 bg-blue-500/10 text-blue-500 rounded-full w-fit text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                    <Layers size={14} /> Choose your session
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupOrItem.map((item) => (
                                        <SessionCard 
                                            key={item.id}
                                            item={item}
                                            isLive={item.id === currentId}
                                            isGrouped
                                            user={user}
                                            onSelect={() => handleSelectSession(item)}
                                            isSelecting={selectingId === item.id}
                                            getStyles={getCategoryStyles}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <SessionCard 
                                item={firstItem}
                                isLive={isLive}
                                user={user}
                                getStyles={getCategoryStyles}
                            />
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
};

interface SessionCardProps {
    item: AgendaItem;
    isLive: boolean;
    isGrouped?: boolean;
    user: any;
    onSelect?: () => void;
    isSelecting?: boolean;
    getStyles: (cat?: string) => { icon: React.ReactNode, color: string, bg: string, border: string, label: string };
}

const SessionCard = ({ item, isLive, isGrouped, user, onSelect, isSelecting, getStyles }: SessionCardProps) => {
    const styles = getStyles(item.category);
    const isSelected = user && item.attendeeSelections?.includes(user.uid);
    const isBreak = item.category === 'break' || item.isBreak;

    return (
        <GlassCard
            className={cn(
                "group relative overflow-hidden transition-all duration-500",
                isLive && "border-accent ring-2 ring-accent/20 bg-accent/[0.02] shadow-2xl shadow-accent/10",
                isSelected && "border-green-500/50 bg-green-500/[0.02]",
                isBreak && "opacity-80 scale-[0.98] grayscale-[0.5] hover:grayscale-0",
                !isLive && !isSelected && styles.border,
                isGrouped ? "p-6" : "p-6 md:p-8"
            )}
        >
            {/* Category Indicator Line */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1 transition-all duration-500",
                isLive ? "bg-accent" : isSelected ? "bg-green-500" : styles.bg.replace('/10', '/50')
            )} />
            <div className={cn(
                "flex flex-col gap-6",
                !isGrouped && "md:flex-row md:items-start"
            )}>
                {/* Time & Icon */}
                <div className={cn(
                    "flex items-center gap-4 shrink-0",
                    !isGrouped && "md:w-32 md:flex-col md:items-start md:gap-1"
                )}>
                    <div className="flex items-center gap-2 text-accent font-black text-sm uppercase tracking-wider">
                        <Clock size={16} />
                        {item.startTime}
                    </div>
                    <div className="text-[10px] text-surface-dark/30 dark:text-white/30 font-bold uppercase tracking-tighter">
                        Until {item.endTime}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            isLive ? "bg-white/20 text-white" : `${styles.bg} ${styles.color} ${styles.border}`
                        )}>
                            {styles.icon}
                            {styles.label}
                        </div>
                        
                        {isLive && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-[9px] font-black text-white uppercase tracking-widest animate-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-white" /> Live Now
                            </div>
                        )}

                        {isSelected && !isBreak && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500 text-[9px] font-black text-white uppercase tracking-widest">
                                <CheckCircle2 size={10} /> Attending
                            </div>
                        )}
                    </div>

                    <h4 className={cn(
                        "font-black text-surface-dark dark:text-white transition-colors group-hover:text-accent",
                        isGrouped ? "text-xl" : "text-2xl"
                    )}>
                        {item.title}
                    </h4>

                    {item.description && (
                        <p className={cn(
                            "text-surface-dark/50 dark:text-white/50 font-medium mt-2 line-clamp-2",
                            isGrouped ? "text-xs" : "text-sm"
                        )}>
                            {item.description}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-6">
                        {item.speaker && (
                            <div className="flex items-center gap-2 text-xs font-bold text-surface-dark/70 dark:text-white/70">
                                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-[10px] text-accent font-black">
                                    {item.speaker[0]}
                                </div>
                                {item.speaker}
                            </div>
                        )}
                        {item.location && (
                            <div className="flex items-center gap-2 text-xs font-bold text-surface-dark/40 dark:text-white/40">
                                <MapPin size={14} className="text-accent/60" />
                                {item.location}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action for Grouped Items */}
                {isGrouped && onSelect && (
                    <div className="mt-4 pt-4 border-t border-surface-dark/5 dark:border-white/5">
                        <button
                            onClick={onSelect}
                            disabled={isSelecting}
                            className={cn(
                                "w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all box-shadow-xl",
                                isSelected 
                                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
                                    : "bg-surface-dark/5 dark:bg-white/5 text-surface-dark dark:text-white hover:bg-accent hover:text-white"
                            )}
                        >
                            {isSelecting ? "Updating..." : isSelected ? "Session Booked" : "Select this session"}
                        </button>
                    </div>
                )}

                {!isGrouped && !isBreak && (
                    <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-dark/5 dark:bg-white/5 group-hover:bg-accent group-hover:text-white transition-all duration-300 self-center">
                        <ChevronRight size={20} />
                    </div>
                )}
            </div>
            
            {/* Background Glow for Live */}
            {isLive && (
                <div className="absolute -right-20 -top-20 w-40 h-40 bg-accent/10 blur-[80px] rounded-full pointer-events-none" />
            )}
        </GlassCard>
    );
};
