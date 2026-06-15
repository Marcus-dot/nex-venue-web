"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { eventService } from "@/services/events";
import { agendaService } from "@/services/agenda";
import { Event, RoleRequest, EventParticipant, EventRole } from "@/types/events";
import { AgendaItem } from "@/types/agenda";
import { UserProfile } from "@/types/auth";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

// Read any user's profile without touching global auth state
async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch { return null; }
}
import { GlassCard } from "@/components/ui/GlassCard";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
    ArrowLeft,
    Check,
    X,
    Shield,
    Mic,
    Store,
    Users,
    User,
    Loader2,
    Calendar,
    Clock,
    MapPin,
    Plus,
    Trash2,
    Settings,
    Layout,
    CheckCircle2,
    Tags,
    Info,
    Layers,
    FileText,
    Star,
    Lightbulb,
    Coffee,
    Monitor,
    BookOpen,
    Flame,
    Megaphone,
    Presentation,
    MessageSquare,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_CONFIG, CategoryKey } from "@/lib/constants/agenda";

type Tab = "settings" | "agenda" | "staff";

export default function EventManagePage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<Tab>("agenda");
    const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void; title?: string; confirmLabel?: string } | null>(null);
    const [event, setEvent] = useState<Event | null>(null);
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [requests, setRequests] = useState<RoleRequest[]>([]);
    const [requestProfiles, setRequestProfiles] = useState<Record<string, UserProfile | null>>({});
    const [participants, setParticipants] = useState<EventParticipant[]>([]);
    const [participantProfiles, setParticipantProfiles] = useState<Record<string, UserProfile | null>>({});
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Form states
    const [settingsForm, setSettingsForm] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
    });

    const [newAgendaItem, setNewAgendaItem] = useState({
        title: "",
        startTime: "",
        endTime: "",
        location: "",
        speaker: "",
        description: "",
        category: "presentation" as AgendaItem["category"],
        isBreak: false,
        maxAttendees: "" as string | number, // use string for input handling
        speakerBio: "",
        simultaneousGroupId: "",
    });

    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

    useEffect(() => {
        if (!id || !user) return;

        const fetchData = async () => {
            const data = await eventService.getEventById(id as string);
            if (!data) {
                router.push("/events");
                return;
            }

            const isOrganiser = data.organisers?.includes(user.uid);
            const isCreator = data.creatorId === user.uid;

            // Re-derive isAdmin from the freshly fetched Firestore profile,
            // not from the potentially stale cached profile in AuthContext
            const freshProfile = await getUserProfile(user.uid);
            const isFreshAdmin = freshProfile?.role === "admin";

            if (!isOrganiser && !isCreator && !isFreshAdmin) {
                router.push(`/events/${id}`);
                return;
            }

            setEvent(data);
            setSettingsForm({
                title: data.title,
                description: data.description,
                date: data.date,
                time: data.time,
                location: data.location,
            });

            // Load current staff participants
            const parts = await eventService.getEventParticipants(id as string);
            setParticipants(parts);
            setLoading(false);
        };

        fetchData();

        // Subscriptions
        const unsubAgenda = agendaService.subscribeToAgenda(id as string, (items) => {
            setAgenda(items);
        });

        const unsubRequests = eventService.getRoleRequests(id as string, (data) => {
            setRequests(data);
        });

        return () => {
            unsubAgenda();
            unsubRequests();
        };
    }, [id, user, router]);

    // Fetch applicant profiles via direct Firestore read — never touches global auth state
    useEffect(() => {
        if (requests.length === 0) return;
        const unfetched = requests.filter(r => !(r.userId in requestProfiles));
        if (unfetched.length === 0) return;
        unfetched.forEach(async (req) => {
            const p = await getUserProfile(req.userId);
            setRequestProfiles(prev => ({ ...prev, [req.userId]: p }));
        });
    }, [requests]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch profiles for current staff participants
    useEffect(() => {
        if (participants.length === 0) return;
        const unfetched = participants.filter(p => !(p.id in participantProfiles));
        if (unfetched.length === 0) return;
        unfetched.forEach(async (part) => {
            const p = await getUserProfile(part.id);
            setParticipantProfiles(prev => ({ ...prev, [part.id]: p }));
        });
    }, [participants]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!event) return;
        setSaveLoading(true);
        try {
            await eventService.updateEvent(event.id, settingsForm);
            showToast("Event settings updated successfully!", "success");
        } catch (error) {
            console.error("Error updating settings:", error);
            showToast("Failed to update settings.", "error");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleAddAgendaItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!event || !user) return;
        setSaveLoading(true);
        try {
            await agendaService.createAgendaItem({
                ...newAgendaItem,
                maxAttendees: newAgendaItem.maxAttendees ? Number(newAgendaItem.maxAttendees) : undefined,
                eventId: event.id,
                date: event.date,
                attendeeSelections: [],
                createdBy: user!.uid,
                lastEditedBy: user!.uid,
                order: agenda.length,
            });
            setNewAgendaItem({
                title: "",
                startTime: "",
                endTime: "",
                location: "",
                speaker: "",
                description: "",
                category: "presentation",
                isBreak: false,
                maxAttendees: "",
                speakerBio: "",
                simultaneousGroupId: "",
            });
            showToast("Agenda item added!", "success");
        } catch (error) {
            console.error("Error adding agenda item:", error);
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDeleteAgendaItem = (itemId: string) => {
        setConfirmModal({
            message: "Are you sure you want to delete this session?",
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await agendaService.deleteAgendaItem(itemId);
                } catch (error) {
                    console.error("Error deleting agenda item:", error);
                }
            },
        });
    };

    const handleSetGoLive = async (itemId: string | null) => {
        if (!event) return;
        try {
            await agendaService.setCurrentAgendaItem(event.id, itemId);
        } catch (error) {
            console.error("Error setting current session:", error);
        }
    };

    const handleApprove = async (request: RoleRequest) => {
        if (!event) return;
        setActionLoading(request.id);
        try {
            await eventService.approveRoleRequest(request.id);
            // Refresh participants list
            const parts = await eventService.getEventParticipants(event.id);
            setParticipants(parts);
            showToast(`${request.userName} approved as ${request.requestedRole}`, "success");
        } catch (error) {
            console.error("Error approving request:", error);
            showToast("Failed to approve request.", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (requestId: string, userName?: string) => {
        setActionLoading(requestId);
        try {
            await eventService.rejectRoleRequest(requestId);
            showToast(`${userName ? `${userName}'s` : "Role"} request declined.`, "info");
        } catch (error) {
            console.error("Error rejecting request:", error);
            showToast("Failed to decline request.", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRevoke = (participant: EventParticipant) => {
        setConfirmModal({
            title: "Revoke Role",
            confirmLabel: "Revoke",
            message: `Remove ${participant.displayName}'s ${participant.role} role? They'll remain an attendee.`,
            onConfirm: async () => {
                setConfirmModal(null);
                setActionLoading(participant.id);
                try {
                    await eventService.revokeRole(event!.id, participant.id, participant.role as EventRole);
                    setParticipants(prev => prev.filter(p => p.id !== participant.id));
                    showToast(`${participant.displayName}'s ${participant.role} role revoked.`, "success");
                } catch (error) {
                    console.error("Error revoking role:", error);
                    showToast("Failed to revoke role.", "error");
                } finally {
                    setActionLoading(null);
                }
            },
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }

    if (!event) return null;

    const tabs = [
        { id: "agenda", label: "Agenda", icon: Layout },
        { id: "staff", label: "Staff", icon: Users },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <>
            <div className="min-h-screen bg-background dark:bg-[#0f101e] px-8 py-12">
                <div className="max-w-4xl mx-auto">
                    <Link href={`/events/${id}`} className="flex items-center gap-2 text-surface-dark/60 dark:text-white/60 hover:text-accent font-medium mb-8">
                        <ArrowLeft size={20} /> Back to Event
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-surface-dark dark:text-white mb-2 tracking-tight">Event Controls</h1>
                            <p className="text-surface-dark/60 dark:text-white/60 font-medium">Manage and refine your event experience.</p>
                        </div>

                        <div className="flex bg-surface-dark/5 dark:bg-white/5 p-1.5 rounded-2xl">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={cn(
                                        "px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all font-black text-sm whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "bg-white dark:bg-white/10 text-accent shadow-sm"
                                            : "text-surface-dark/40 dark:text-white/40 hover:text-surface-dark dark:hover:text-white"
                                    )}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-8">
                        {activeTab === "settings" && (
                            <GlassCard className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xl font-black text-surface-dark dark:text-white mb-8 flex items-center gap-2">
                                    <Settings size={22} className="text-accent" /> Event Settings
                                </h3>
                                <form onSubmit={handleUpdateSettings} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1 italic opacity-50">Event Title</label>
                                        <Input
                                            value={settingsForm.title}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1 italic opacity-50">Description</label>
                                        <textarea
                                            className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 text-surface-dark dark:text-white font-medium min-h-[120px]"
                                            value={settingsForm.description}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <DatePicker
                                            label="Date"
                                            value={settingsForm.date}
                                            onChange={(date) => setSettingsForm({ ...settingsForm, date })}
                                        />
                                        <TimePicker
                                            label="Time"
                                            value={settingsForm.time}
                                            onChange={(time) => setSettingsForm({ ...settingsForm, time })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1 italic opacity-50">Location</label>
                                        <Input
                                            placeholder="Online or Physical Address"
                                            value={settingsForm.location}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="pt-4">
                                        <Button type="submit" className="w-full py-4 text-lg font-black" disabled={saveLoading}>
                                            {saveLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : "Save Changes"}
                                        </Button>
                                    </div>
                                </form>
                            </GlassCard>
                        )}

                        {activeTab === "agenda" && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Add New Session */}
                                <GlassCard className="!p-8 border-2 border-accent/20 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
                                    <div className="relative flex items-center justify-between mb-10">
                                        <div>
                                            <h3 className="text-2xl font-black text-surface-dark dark:text-white flex items-center gap-3">
                                                <Plus size={26} className="text-accent" /> New Session
                                            </h3>
                                            <p className="text-sm font-medium text-surface-dark/40 dark:text-white/40 mt-1">Fill in the details to expand your event's timeline.</p>
                                        </div>
                                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-accent font-black text-[10px] uppercase tracking-widest border border-accent/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                            Drafting Session
                                        </div>
                                    </div>

                                    <form onSubmit={handleAddAgendaItem} className="relative space-y-10">
                                        {/* Primary Info Segment */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                                    <Info size={18} />
                                                </div>
                                                <span className="font-black text-sm uppercase tracking-widest text-surface-dark/60 dark:text-white/60">Core Details</span>
                                                <div className="flex-grow h-px bg-surface-dark/5 dark:bg-white/5" />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                <div className="md:col-span-8 space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-surface-dark/50 dark:text-white/40 ml-1">Session Title</label>
                                                    <Input
                                                        placeholder="e.g. Future of Event Tech Keynote"
                                                        value={newAgendaItem.title}
                                                        onChange={(e) => setNewAgendaItem({ ...newAgendaItem, title: e.target.value })}
                                                        required
                                                        className="h-14 text-lg"
                                                    />
                                                </div>
                                                <div className="md:col-span-12 space-y-4">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-[11px] font-black uppercase tracking-wider text-surface-dark/50 dark:text-white/40">Session Category</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                                                            className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-accent/5"
                                                        >
                                                            {isCategoryPickerOpen ? "Close Selection" : "Change Category"}
                                                            <ChevronRight size={14} className={cn("transition-transform duration-300", isCategoryPickerOpen ? "-rotate-90" : "rotate-90")} />
                                                        </button>
                                                    </div>

                                                    <AnimatePresence initial={false}>
                                                        {!isCategoryPickerOpen ? (
                                                            <motion.div
                                                                key="selected-tab"
                                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                                onClick={() => setIsCategoryPickerOpen(true)}
                                                                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-surface-dark/5 dark:border-white/5 cursor-pointer hover:bg-white/10 transition-all group overflow-hidden"
                                                            >
                                                                <div className={cn(
                                                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                                                                    (CATEGORY_CONFIG[newAgendaItem.category as CategoryKey] || CATEGORY_CONFIG.other).color,
                                                                    (CATEGORY_CONFIG[newAgendaItem.category as CategoryKey] || CATEGORY_CONFIG.other).bg
                                                                )}>
                                                                    {React.createElement((CATEGORY_CONFIG[newAgendaItem.category as CategoryKey] || CATEGORY_CONFIG.other).icon, { size: 24 })}
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-surface-dark/40 dark:text-white/40 mb-0.5">Selected Category</div>
                                                                    <div className="text-sm font-black text-surface-dark dark:text-white uppercase tracking-wider">
                                                                        {(CATEGORY_CONFIG[newAgendaItem.category as CategoryKey] || CATEGORY_CONFIG.other).label}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            <motion.div
                                                                key="picker-grid"
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-4 px-1">
                                                                    {(Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map((catKey, idx) => {
                                                                        const config = CATEGORY_CONFIG[catKey];
                                                                        const isSelected = newAgendaItem.category === catKey;
                                                                        return (
                                                                            <motion.button
                                                                                key={catKey}
                                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                                animate={{ opacity: 1, scale: 1 }}
                                                                                transition={{ delay: idx * 0.02 }}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setNewAgendaItem({ ...newAgendaItem, category: catKey, isBreak: catKey === 'break' });
                                                                                    setTimeout(() => setIsCategoryPickerOpen(false), 200);
                                                                                }}
                                                                                className={cn(
                                                                                    "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 gap-2 text-center group relative",
                                                                                    isSelected
                                                                                        ? `${config.bg.replace('/10', '/20')} border-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.15)]`
                                                                                        : "bg-surface-dark/5 dark:bg-white/5 border-transparent hover:bg-surface-dark/10 dark:hover:bg-white/10"
                                                                                )}
                                                                            >
                                                                                <div className={cn(
                                                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300",
                                                                                    isSelected ? `${config.color} scale-110` : "text-surface-dark/30 dark:text-white/30 group-hover:scale-110"
                                                                                )}>
                                                                                    <config.icon size={20} />
                                                                                </div>
                                                                                <span className={cn(
                                                                                    "text-[10px] font-black uppercase tracking-widest",
                                                                                    isSelected ? config.color : "text-surface-dark/40 dark:text-white/40"
                                                                                )}>
                                                                                    {config.label}
                                                                                </span>
                                                                                
                                                                                {isSelected && (
                                                                                    <motion.div 
                                                                                        layoutId="active-category-glow"
                                                                                        className="absolute inset-0 rounded-2xl ring-2 ring-accent/20 pointer-events-none" 
                                                                                    />
                                                                                )}
                                                                            </motion.button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-surface-dark/50 dark:text-white/40 ml-1">Speaker / Host</label>
                                                    <div className="relative">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-accent/50">
                                                            <Mic size={18} />
                                                        </div>
                                                        <Input
                                                            placeholder="e.g. Sarah Chen"
                                                            value={newAgendaItem.speaker}
                                                            onChange={(e) => setNewAgendaItem({ ...newAgendaItem, speaker: e.target.value })}
                                                            className="pl-12 h-14"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-surface-dark/50 dark:text-white/40 ml-1">Location</label>
                                                    <div className="relative">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-accent/50">
                                                            <MapPin size={18} />
                                                        </div>
                                                        <Input
                                                            placeholder="e.g. Main Hall A"
                                                            value={newAgendaItem.location}
                                                            onChange={(e) => setNewAgendaItem({ ...newAgendaItem, location: e.target.value })}
                                                            className="pl-12 h-14"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timing Segment */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                                    <Clock size={18} />
                                                </div>
                                                <span className="font-black text-sm uppercase tracking-widest text-surface-dark/60 dark:text-white/60">Schedule & Limits</span>
                                                <div className="flex-grow h-px bg-surface-dark/5 dark:bg-white/5" />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                                <div className="md:col-span-4">
                                                    <TimePicker
                                                        label="START TIME"
                                                        value={newAgendaItem.startTime}
                                                        onChange={(startTime) => setNewAgendaItem({ ...newAgendaItem, startTime })}
                                                    />
                                                </div>
                                                <div className="md:col-span-4">
                                                    <TimePicker
                                                        label="END TIME"
                                                        value={newAgendaItem.endTime}
                                                        onChange={(endTime) => setNewAgendaItem({ ...newAgendaItem, endTime })}
                                                    />
                                                </div>
                                                <div className="md:col-span-4 space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-surface-dark/50 dark:text-white/40 ml-1">Simultaneous Group</label>
                                                    <div className="relative">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-accent/50">
                                                            <Layers size={18} />
                                                        </div>
                                                        <Input
                                                            placeholder="e.g. breakout-A"
                                                            value={newAgendaItem.simultaneousGroupId}
                                                            onChange={(e) => setNewAgendaItem({ ...newAgendaItem, simultaneousGroupId: e.target.value })}
                                                            className="pl-12 h-14"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-grow space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-surface-dark/50 dark:text-white/40 ml-1">Attendee Capacity (Optional)</label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Unlimited"
                                                        value={newAgendaItem.maxAttendees}
                                                        onChange={(e) => setNewAgendaItem({ ...newAgendaItem, maxAttendees: e.target.value })}
                                                        className="h-14"
                                                    />
                                                </div>
                                                <div className="md:w-64 pt-6 md:pt-8">
                                                    <label className="flex items-center gap-4 p-4 rounded-xl border border-surface-dark/10 dark:border-white/10 hover:border-accent/40 bg-white/5 cursor-pointer transition-all group h-14">
                                                        <input
                                                            type="checkbox"
                                                            className="w-5 h-5 rounded-md border-surface-dark/10 accent-accent"
                                                            checked={newAgendaItem.isBreak}
                                                            onChange={(e) => setNewAgendaItem({ ...newAgendaItem, isBreak: e.target.checked })}
                                                        />
                                                        <div>
                                                            <div className="text-[11px] font-black uppercase tracking-wider text-surface-dark/40 dark:text-white/40 group-hover:text-accent transition-colors">Is this a break?</div>
                                                            <div className="text-[9px] font-bold text-surface-dark/20 dark:text-white/20 -mt-0.5">Disables speaker fields</div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Narrative Segment */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                                    <FileText size={18} />
                                                </div>
                                                <span className="font-black text-sm uppercase tracking-widest text-surface-dark/60 dark:text-white/60">Session Narrative</span>
                                                <div className="flex-grow h-px bg-surface-dark/5 dark:bg-white/5" />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-surface-dark/50 dark:text-white/40 ml-1 flex items-center gap-2">
                                                        <Info size={14} /> Description
                                                    </label>
                                                    <textarea
                                                        placeholder="Describe the session topics..."
                                                        className="w-full px-6 py-5 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 text-surface-dark dark:text-white font-medium min-h-[140px] text-sm overflow-hidden"
                                                        value={newAgendaItem.description}
                                                        onChange={(e) => setNewAgendaItem({ ...newAgendaItem, description: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-surface-dark/50 dark:text-white/40 ml-1 flex items-center gap-2">
                                                        <Mic size={14} /> Speaker Bio
                                                    </label>
                                                    <textarea
                                                        placeholder="Describe the speaker's background..."
                                                        className="w-full px-6 py-5 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 text-surface-dark dark:text-white font-medium min-h-[140px] text-sm overflow-hidden"
                                                        value={newAgendaItem.speakerBio}
                                                        onChange={(e) => setNewAgendaItem({ ...newAgendaItem, speakerBio: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-surface-dark/5 dark:border-white/5">
                                            <Button type="submit" disabled={saveLoading} className="w-full font-black py-7 text-xl shadow-2xl shadow-accent/20 transition-all active:scale-[0.98] group overflow-hidden relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent-dark opacity-0 group-hover:opacity-10 transition-opacity" />
                                                {saveLoading ? <Loader2 className="animate-spin mx-auto" size={32} /> : (
                                                    <span className="flex items-center justify-center gap-3">
                                                        Publish to Schedule <Plus size={24} strokeWidth={3} />
                                                    </span>
                                                )}
                                            </Button>
                                        </div></form>
                                </GlassCard>

                                {/* Session List */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h3 className="text-2xl font-black text-surface-dark dark:text-white px-2">Current Schedule</h3>
                                            <p className="text-sm font-medium text-surface-dark/40 dark:text-white/40 px-2 mt-1">Live management of your event's timeline.</p>
                                        </div>
                                        {event.currentAgendaItem && (
                                            <button
                                                onClick={() => handleSetGoLive(null)}
                                                className="px-6 py-2 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                            >
                                                End Live Broadcast
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {agenda.length === 0 ? (
                                            <div className="py-20 text-center border-2 border-dashed border-surface-dark/5 dark:border-white/5 rounded-[40px] bg-white/5">
                                                <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center mx-auto mb-6 text-accent/20">
                                                    <Calendar size={40} />
                                                </div>
                                                <h4 className="text-xl font-black text-surface-dark dark:text-white">Empty Schedule</h4>
                                                <p className="text-surface-dark/40 dark:text-white/40 font-medium max-w-xs mx-auto mt-2">Start adding sessions above to build your event's timeline.</p>
                                            </div>
                                        ) : (
                                            (() => {
                                                const groupedAgenda: (AgendaItem | AgendaItem[])[] = [];
                                                const processedGroupIds = new Set<string>();

                                                agenda.forEach(item => {
                                                    if (item.simultaneousGroupId) {
                                                        if (processedGroupIds.has(item.simultaneousGroupId)) return;
                                                        const group = agenda.filter(i => i.simultaneousGroupId === item.simultaneousGroupId);
                                                        groupedAgenda.push(group);
                                                        processedGroupIds.add(item.simultaneousGroupId);
                                                    } else {
                                                        groupedAgenda.push(item);
                                                    }
                                                });

                                                return groupedAgenda.map((groupOrItem, idx) => {
                                                    const isGroup = Array.isArray(groupOrItem);
                                                    const firstItem = isGroup ? groupOrItem[0] : groupOrItem;

                                                    return (
                                                        <div key={isGroup ? `group-${firstItem.simultaneousGroupId}` : firstItem.id} className="relative">
                                                            {isGroup ? (
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-2 px-4 py-1.5 bg-accent/5 text-accent rounded-full w-fit text-[9px] font-black uppercase tracking-widest mb-2 ml-2">
                                                                        <Layers size={12} /> Simultaneous Group: {firstItem.simultaneousGroupId}
                                                                    </div>
                                                                    <div className="grid gap-3 relative pl-6 border-l-2 border-accent/10 ml-2">
                                                                        {groupOrItem.map(item => (
                                                                            <AgendaManagementCard
                                                                                key={item.id}
                                                                                item={item}
                                                                                getStyles={getCategoryStyles}
                                                                                onDelete={() => handleDeleteAgendaItem(item.id)}
                                                                                onStartLive={() => handleSetGoLive(item.id)}
                                                                                isCurrent={event.currentAgendaItem === item.id}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <AgendaManagementCard
                                                                    item={firstItem}
                                                                    getStyles={getCategoryStyles}
                                                                    onDelete={() => handleDeleteAgendaItem(firstItem.id)}
                                                                    onStartLive={() => handleSetGoLive(firstItem.id)}
                                                                    isCurrent={event.currentAgendaItem === firstItem.id}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                });
                                            })()
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "staff" && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                {/* Header row */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-surface-dark dark:text-white">Staff Applications</h3>
                                        <p className="text-sm text-surface-dark/40 dark:text-white/40 font-medium mt-0.5">Review and approve role requests from attendees</p>
                                    </div>
                                    {requests.length > 0 && (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-black">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                            {requests.length} pending
                                        </span>
                                    )}
                                </div>

                                {requests.length === 0 ? (
                                    <GlassCard className="!p-16 text-center border-2 border-dashed border-surface-dark/8 dark:border-white/8">
                                        <div className="w-16 h-16 rounded-2xl bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 size={28} className="text-surface-dark/20 dark:text-white/20" />
                                        </div>
                                        <p className="font-black text-surface-dark/40 dark:text-white/40">All clear</p>
                                        <p className="text-sm text-surface-dark/30 dark:text-white/30 mt-1 font-medium">No pending applications right now.</p>
                                    </GlassCard>
                                ) : (
                                    <div className="grid gap-3">
                                        {requests.map((req) => {
                                            const applicantProfile = requestProfiles[req.userId];
                                            const roleColors: Record<string, { bg: string; text: string; border: string }> = {
                                                organiser: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
                                                speaker:   { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20" },
                                                exhibitor: { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/20" },
                                            };
                                            const roleStyle = roleColors[req.requestedRole] ?? roleColors.organiser;

                                            return (
                                                <GlassCard key={req.id} className="!p-5 hover:border-accent/20 transition-all">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                                                        {/* Avatar + identity */}
                                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                                            <AvatarDisplay
                                                                avatarUrl={applicantProfile?.avatar ?? null}
                                                                fullName={req.userName}
                                                                size={52}
                                                                className="shrink-0"
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <Link
                                                                        href={`/profile/${req.userId}`}
                                                                        className="font-black text-surface-dark dark:text-white hover:text-accent transition-colors"
                                                                    >
                                                                        {req.userName}
                                                                    </Link>
                                                                    <span className={cn(
                                                                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                                        roleStyle.bg, roleStyle.text, roleStyle.border
                                                                    )}>
                                                                        {req.requestedRole}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                                    {applicantProfile?.jobTitle && (
                                                                        <span className="text-xs text-surface-dark/50 dark:text-white/50 font-medium">
                                                                            {applicantProfile.jobTitle}{applicantProfile.company ? ` · ${applicantProfile.company}` : ""}
                                                                        </span>
                                                                    )}
                                                                    {req.userEmail && (
                                                                        <span className="text-xs text-surface-dark/30 dark:text-white/30 font-medium truncate max-w-[180px]">
                                                                            {req.userEmail}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {applicantProfile?.bio && (
                                                                    <p className="text-xs text-surface-dark/40 dark:text-white/40 mt-1 line-clamp-1 font-medium">
                                                                        {applicantProfile.bio}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Link
                                                                href={`/profile/${req.userId}`}
                                                                className="px-3 py-2 rounded-xl text-xs font-black text-surface-dark/40 dark:text-white/40 hover:text-accent hover:bg-accent/5 border border-surface-dark/8 dark:border-white/8 hover:border-accent/20 transition-all"
                                                            >
                                                                View Profile
                                                            </Link>
                                                            <button
                                                                disabled={actionLoading === req.id}
                                                                onClick={() => handleReject(req.id, req.userName)}
                                                                className="px-3 py-2 rounded-xl text-xs font-black text-red-400 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-40"
                                                            >
                                                                Decline
                                                            </button>
                                                            <button
                                                                disabled={actionLoading === req.id}
                                                                onClick={() => handleApprove(req)}
                                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-accent text-white hover:bg-accent/90 shadow-sm shadow-accent/20 transition-all disabled:opacity-40"
                                                            >
                                                                {actionLoading === req.id
                                                                    ? <Loader2 className="animate-spin" size={14} />
                                                                    : <><Check size={13} strokeWidth={3} /> Approve</>
                                                                }
                                                            </button>
                                                        </div>
                                                    </div>
                                                </GlassCard>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Current Staff — only visible to the event creator */}
                                {participants.length > 0 && user?.uid === event?.creatorId && (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-xl font-black text-surface-dark dark:text-white">Current Staff</h3>
                                            <p className="text-sm text-surface-dark/40 dark:text-white/40 font-medium mt-0.5">Approved members with active roles on this event</p>
                                        </div>
                                        <div className="grid gap-3">
                                            {participants.map((part) => {
                                                const profile = participantProfiles[part.id];
                                                const roleColors: Record<string, { bg: string; text: string; border: string }> = {
                                                    organiser: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
                                                    speaker:   { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20" },
                                                    exhibitor: { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/20" },
                                                };
                                                const roleStyle = roleColors[part.role] ?? roleColors.organiser;
                                                const isCreator = event?.creatorId === part.id;

                                                return (
                                                    <GlassCard key={part.id} className="!p-5 transition-all">
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                <AvatarDisplay
                                                                    avatarUrl={profile?.avatar ?? null}
                                                                    fullName={part.displayName}
                                                                    size={52}
                                                                    className="shrink-0"
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <Link
                                                                            href={`/profile/${part.id}`}
                                                                            className="font-black text-surface-dark dark:text-white hover:text-accent transition-colors"
                                                                        >
                                                                            {part.displayName}
                                                                        </Link>
                                                                        <span className={cn(
                                                                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                                            roleStyle.bg, roleStyle.text, roleStyle.border
                                                                        )}>
                                                                            {part.role}
                                                                        </span>
                                                                        {isCreator && (
                                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                                                                                Creator
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {(profile?.jobTitle || profile?.company) && (
                                                                        <p className="text-xs text-surface-dark/50 dark:text-white/50 font-medium mt-0.5">
                                                                            {[profile.jobTitle, profile.company].filter(Boolean).join(" · ")}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Link
                                                                    href={`/profile/${part.id}`}
                                                                    className="px-3 py-2 rounded-xl text-xs font-black text-surface-dark/40 dark:text-white/40 hover:text-accent hover:bg-accent/5 border border-surface-dark/8 dark:border-white/8 hover:border-accent/20 transition-all"
                                                                >
                                                                    View Profile
                                                                </Link>
                                                                {!isCreator && (
                                                                    <button
                                                                        disabled={actionLoading === part.id}
                                                                        onClick={() => handleRevoke(part)}
                                                                        className="px-3 py-2 rounded-xl text-xs font-black text-red-400 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-40"
                                                                    >
                                                                        {actionLoading === part.id
                                                                            ? <Loader2 className="animate-spin" size={14} />
                                                                            : "Revoke"
                                                                        }
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </GlassCard>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!confirmModal}
                message={confirmModal?.message ?? ""}
                onConfirm={() => confirmModal?.onConfirm()}
                onCancel={() => setConfirmModal(null)}
                title={confirmModal?.title ?? "Delete Session"}
                confirmLabel={confirmModal?.confirmLabel ?? "Delete"}
                destructive
            />
        </>
    );
}

interface AgendaManagementCardProps {
    item: AgendaItem;
    getStyles: (cat?: string) => { icon: React.ReactNode, color: string, bg: string, border: string, label: string };
    onDelete: () => void;
    onStartLive: () => void;
    isCurrent: boolean;
}

const AgendaManagementCard = ({ item, getStyles, onDelete, onStartLive, isCurrent }: AgendaManagementCardProps) => {
    const styles = getStyles(item.category);

    return (
        <GlassCard className={cn(
            "group flex flex-col md:flex-row md:items-center gap-6 p-6 transition-all duration-300 relative overflow-hidden",
            isCurrent ? "border-accent/40 bg-accent/[0.03] scale-[1.01] shadow-2xl shadow-accent/10" : "hover:bg-white/5",
            !isCurrent && styles.border
        )}>
            {/* Category Indicator Line */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                isCurrent ? "bg-accent" : styles.bg.replace('/10', '/50')
            )} />

            <div className={cn(
                "w-20 h-20 rounded-3xl flex flex-col items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                isCurrent ? "bg-accent text-white shadow-lg shadow-accent/30" : `${styles.bg} ${styles.color}`
            )}>
                <Clock size={24} strokeWidth={3} />
                <span className="text-[11px] font-black mt-1 uppercase">{item.startTime}</span>
            </div>

            <div className="flex-grow">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="text-xl font-black text-surface-dark dark:text-white group-hover:text-accent transition-colors">{item.title}</h4>
                    {item.category && (
                        <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                            isCurrent ? "bg-white/20 text-white" : `${styles.bg} ${styles.color} ${styles.border}`
                        )}>
                            {styles.icon} {styles.label}
                        </span>
                    )}
                    {isCurrent && (
                        <span className="px-3 py-1 rounded-full bg-green-500 text-white text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" /> Live Now
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-5 text-[11px] font-bold text-surface-dark/40 dark:text-white/30 uppercase tracking-tighter">
                    <span className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center">
                            <User size={10} className="text-accent" />
                        </div>
                        {item.speaker || "No Speaker Assigned"}
                    </span>
                    <span className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center">
                            <MapPin size={10} className="text-accent" />
                        </div>
                        {item.location || "Location TBD"}
                    </span>
                    <span className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center">
                            <Clock size={10} className="text-accent" />
                        </div>
                        Ends at {item.endTime}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4 border-l border-surface-dark/5 dark:border-white/5 pl-6">
                <button
                    onClick={onStartLive}
                    disabled={isCurrent}
                    className={cn(
                        "px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                        isCurrent
                            ? "bg-green-500/20 text-green-500 cursor-default"
                            : "bg-surface-dark dark:bg-white text-white dark:text-surface-dark hover:bg-accent hover:text-white dark:hover:bg-accent shadow-lg shadow-black/10"
                    )}
                >
                    {isCurrent ? "Session Active" : "Go Live"}
                </button>
                <button
                    onClick={onDelete}
                    className="w-12 h-12 rounded-2xl bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                    title="Remove Session"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </GlassCard>
    );
};
