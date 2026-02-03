import React from "react";
import { AgendaItem } from "@/types/agenda";
import { GlassCard } from "@/components/ui/GlassCard";
import { Clock, MapPin, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AgendaListProps {
    items: AgendaItem[];
    currentId?: string;
}

export const AgendaList = ({ items, currentId }: AgendaListProps) => {
    if (items.length === 0) {
        return (
            <div className="py-12 text-center text-surface-dark/40 border-2 border-dashed border-surface-dark/5 rounded-3xl font-medium">
                The agenda hasn't been posted yet. Check back soon!
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    layout
                >
                    <GlassCard
                        className={cn(
                            "flex flex-col md:flex-row md:items-center gap-6 p-5 transition-all !duration-500",
                            item.id === currentId && "border-accent ring-2 ring-accent/10 bg-accent/5"
                        )}
                    >
                        {/* Time Indicator */}
                        <div className="md:w-32 flex flex-col pt-1">
                            <div className="flex items-center gap-2 text-accent font-bold">
                                <Clock size={16} />
                                <span>{item.startTime}</span>
                            </div>
                            <div className="text-xs text-surface-dark/30 font-bold ml-6">
                                Ends {item.endTime}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                                {item.category && (
                                    <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-black uppercase tracking-wider">
                                        {item.category.replace('_', ' ')}
                                    </span>
                                )}
                                {item.id === currentId && (
                                    <span className="px-2 py-0.5 rounded-md bg-green-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                                        Live
                                    </span>
                                )}
                            </div>
                            <h4 className="text-lg font-black text-surface-dark">{item.title}</h4>
                            <p className="text-surface-dark/50 text-sm mt-1 mb-3 line-clamp-2">
                                {item.description}
                            </p>

                            <div className="flex flex-wrap gap-4 mt-auto">
                                {item.speaker && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-surface-dark/70">
                                        <User size={14} className="text-accent" />
                                        <span>{item.speaker}</span>
                                    </div>
                                )}
                                {item.location && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-surface-dark/70">
                                        <MapPin size={14} className="text-accent" />
                                        <span>{item.location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="hidden md:block">
                            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-surface-dark/20 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            ))}
        </div>
    );
};

import { motion } from "framer-motion";
