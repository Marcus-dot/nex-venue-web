"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { eventService } from "@/services/events";
import { imageUploadService } from "@/services/imageUpload";
import { agendaService } from "@/services/agenda";
import Link from "next/link";
import { Event } from "@/types/events";
import { AgendaItem } from "@/types/agenda";

export default function EditEventPage() {
    const { id } = useParams();
    const { user, profile, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [event, setEvent] = useState<Event | null>(null);
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
    const [showAgendaModal, setShowAgendaModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
    
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Initial state for a new agenda item
    const newAgendaState = {
        title: "",
        description: "",
        startTime: "09:00",
        endTime: "10:00",
        date: "",
        speaker: "",
        location: "",
        category: "presentation" as AgendaItem['category'],
        order: 0,
        simultaneousGroupId: "",
    };
    const [agendaForm, setAgendaForm] = useState(newAgendaState);

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            router.push("/login");
            return;
        }

        if (!isAdmin) {
            router.push(`/events/${id}`);
            return;
        }

        const fetchEvent = async () => {
            if (!id) return;
            const data = await eventService.getEventById(id as string);
            if (data) {
                setEvent(data);
                setFormData({
                    title: data.title,
                    description: data.description,
                    date: data.date,
                    time: data.time,
                    location: data.location,
                });
                setAgendaForm(prev => ({ ...prev, date: data.date })); // Default agenda date to event date
                
                if (data.imageUrl) {
                    setImagePreview(data.imageUrl);
                }

                // Fetch current agenda
                const unsubscribe = agendaService.subscribeToAgenda(data.id, (items) => {
                    setAgenda(items);
                });
                setLoading(false);
                return () => unsubscribe();
            } else {
                router.push("/dashboard");
            }
            setLoading(false);
        };

        fetchEvent();
    }, [id, user, isAdmin, authLoading, router]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !event) return;

        setSaving(true);
        try {
            let imageUrl = event.imageUrl;
            
            // Only upload new image if one was selected
            if (imageFile) {
                const imagePath = `events/${event.id}_${Date.now()}_${imageFile.name}`;
                imageUrl = await imageUploadService.uploadImage(imagePath, imageFile);
                
                // Note: in a production app we'd delete the old image here
                // if (event.imageUrl && event.imageUrl.includes('firebase')) {
                //     const path = getPathFromUrl(event.imageUrl);
                //     if (path) await imageUploadService.deleteImage(path);
                // }
            }

            await eventService.updateEvent(event.id, {
                ...formData,
                imageUrl,
            });
            
            router.push(`/events/${event.id}`);
        } catch (error) {
            console.error("Error updating event:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!event) return;
        setConfirmModal({
            title: "Delete Event",
            message: "Are you sure you want to delete this event? This action cannot be undone.",
            onConfirm: async () => {
                setConfirmModal(null);
                setDeleting(true);
                try {
                    await eventService.deleteEvent(event.id);
                    router.push("/dashboard");
                } catch (error) {
                    console.error("Error deleting event:", error);
                    setDeleting(false);
                }
            },
        });
    };

    // --- AGENDA MANAGEMENT ---

    const openAgendaModal = (item?: AgendaItem) => {
        if (item) {
            setEditingAgendaId(item.id);
            setAgendaForm({
                title: item.title,
                description: item.description || "",
                startTime: item.startTime,
                endTime: item.endTime,
                date: item.date,
                speaker: item.speaker || "",
                location: item.location || "",
                category: item.category || "presentation",
                order: item.order,
                simultaneousGroupId: item.simultaneousGroupId || "",
            });
        } else {
            setEditingAgendaId(null);
            setAgendaForm({ ...newAgendaState, date: event?.date || "" });
        }
        setShowAgendaModal(true);
    };

    const handleSaveAgenda = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!event || !user) return;

        try {
            const itemData = {
                ...agendaForm,
                eventId: event.id,
                updatedAt: Date.now(),
                lastEditedBy: user.uid,
            };

            if (editingAgendaId) {
                await agendaService.updateAgendaItem(editingAgendaId, itemData);
            } else {
                await agendaService.createAgendaItem({
                    ...itemData,
                    createdBy: user.uid,
                });
            }
            setShowAgendaModal(false);
        } catch (error) {
            console.error("Error saving agenda item:", error);
        }
    };

    const handleDeleteAgenda = (id: string) => {
        setConfirmModal({
            title: "Delete Agenda Item",
            message: "Delete this agenda item?",
            onConfirm: async () => {
                setConfirmModal(null);
                await agendaService.deleteAgendaItem(id);
            },
        });
    };

    const handleSetLiveStatus = async (itemId: string | null) => {
        if (!event) return;
        await agendaService.setCurrentAgendaItem(event.id, itemId);
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }
    
    if (!event) return null;

    return (
        <>
        <div className="min-h-screen bg-background dark:bg-[#0f101e] px-8 py-12">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <Link href={`/events/${event.id}`} className="flex items-center gap-2 text-surface-dark/60 dark:text-white/60 hover:text-accent font-medium">
                        <ArrowLeft size={20} /> Back to Event
                    </Link>
                    
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:bg-red-500/10 font-bold gap-2"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} 
                        Delete Event
                    </Button>
                </div>

                <h1 className="text-4xl font-black text-surface-dark dark:text-white mb-4">Edit Event</h1>
                <p className="text-surface-dark/60 dark:text-white/60 mb-12">Update the details for "{event.title}".</p>

                <GlassCard>
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Event Banner Image</label>
                            <div className="relative w-full h-48 bg-surface-dark/5 dark:bg-white/5 border-2 border-dashed border-surface-dark/20 dark:border-white/20 rounded-xl overflow-hidden group hover:border-accent/50 transition-colors flex items-center justify-center cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleImageChange}
                                />
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-surface-dark/40 dark:text-white/40 group-hover:text-accent transition-colors">
                                        <ImageIcon size={32} />
                                        <span className="text-sm font-bold">Click to upload new banner image</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Event Title</label>
                            <Input
                                placeholder="e.g. NexVenue Future Tech Expo"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Description</label>
                            <textarea
                                className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200 placeholder:text-surface-dark/30 dark:placeholder:text-white/30 text-surface-dark dark:text-white font-medium min-h-[120px]"
                                placeholder="What is your event about?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Date</label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Time</label>
                                <Input
                                    type="text"
                                    placeholder="e.g. 10:00 AM"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Location</label>
                            <Input
                                placeholder="Online or physical address"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                            />
                        </div>

                        <div className="pt-4">
                            <Button type="submit" size="lg" className="w-full" disabled={saving}>
                                {saving ? <Loader2 className="animate-spin mx-auto" size={24} /> : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </GlassCard>

                {/* --- AGENDA MANAGEMENT UI --- */}
                <div className="mt-16">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-surface-dark dark:text-white">Event Schedule</h2>
                            <p className="text-surface-dark/60 dark:text-white/60 font-medium mt-1">Manage the agenda and session details.</p>
                        </div>
                        <Button onClick={() => openAgendaModal()} className="font-bold">
                            + Add Session
                        </Button>
                    </div>

                    <div className="space-y-4 mb-20">
                        {agenda.length === 0 ? (
                            <GlassCard className="py-12 text-center text-surface-dark/40 dark:text-white/40 font-bold border-2 border-dashed border-surface-dark/10 dark:border-white/10">
                                No sessions added yet. Click above to build the agenda.
                            </GlassCard>
                        ) : (
                            agenda.map((item) => (
                                <GlassCard key={item.id} className={`!p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 ${event.currentAgendaItem === item.id ? 'border-green-500 ring-2 ring-green-500/10' : ''}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-black text-accent">{item.startTime} - {item.endTime}</span>
                                            {item.category && (
                                                <span className="px-2 py-0.5 rounded bg-surface-dark/5 dark:bg-white/5 text-[10px] font-black uppercase text-surface-dark/60 dark:text-white/60">{item.category}</span>
                                            )}
                                            {event.currentAgendaItem === item.id && (
                                                <span className="px-2 py-0.5 rounded bg-green-500 text-white text-[10px] font-black uppercase animate-pulse">Live Now</span>
                                            )}
                                        </div>
                                        <h4 className="text-xl font-black text-surface-dark dark:text-white">{item.title}</h4>
                                        <div className="flex flex-wrap gap-4 mt-2 text-sm font-bold text-surface-dark/50 dark:text-white/50">
                                            {item.speaker && <span>🗣️ {item.speaker}</span>}
                                            {item.location && <span>📍 {item.location}</span>}
                                            <span>📅 {item.date}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant={event.currentAgendaItem === item.id ? "ghost" : "outline"} 
                                            size="sm" 
                                            onClick={() => handleSetLiveStatus(event.currentAgendaItem === item.id ? null : item.id)}
                                            className={event.currentAgendaItem === item.id ? "text-red-500 hover:text-red-600 hover:bg-red-500/10" : "text-green-600 hover:bg-green-500/10"}
                                        >
                                            {event.currentAgendaItem === item.id ? "Stop Live Status" : "Set Live Status"}
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => openAgendaModal(item)}>Edit</Button>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteAgenda(item.id)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </GlassCard>
                            ))
                        )}
                    </div>
                </div>

                {/* --- AGENDA MODAL --- */}
                {showAgendaModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 dark:bg-black/60 backdrop-blur-sm p-4">
                        <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-black text-surface-dark dark:text-white mb-6">
                                {editingAgendaId ? "Edit Session" : "Add Session"}
                            </h3>
                            <form onSubmit={handleSaveAgenda} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Title</label>
                                    <Input value={agendaForm.title} onChange={e => setAgendaForm({...agendaForm, title: e.target.value})} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Date</label>
                                        <Input type="date" value={agendaForm.date} onChange={e => setAgendaForm({...agendaForm, date: e.target.value})} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Category</label>
                                        <select 
                                            className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl font-medium text-surface-dark dark:text-white focus:outline-none"
                                            value={agendaForm.category} 
                                            onChange={e => setAgendaForm({...agendaForm, category: e.target.value as any})}
                                        >
                                            <option value="presentation">Presentation</option>
                                            <option value="keynote">Keynote</option>
                                            <option value="panel">Panel</option>
                                            <option value="break">Break</option>
                                            <option value="networking">Networking</option>
                                            <option value="workshop">Workshop</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Start Time</label>
                                        <Input type="time" value={agendaForm.startTime} onChange={e => setAgendaForm({...agendaForm, startTime: e.target.value})} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">End Time</label>
                                        <Input type="time" value={agendaForm.endTime} onChange={e => setAgendaForm({...agendaForm, endTime: e.target.value})} required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Speaker (Optional)</label>
                                        <Input value={agendaForm.speaker} onChange={e => setAgendaForm({...agendaForm, speaker: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Location (Optional)</label>
                                        <Input value={agendaForm.location} onChange={e => setAgendaForm({...agendaForm, location: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Simultaneous Group ID (Optional)</label>
                                    <Input 
                                        placeholder="e.g. tracks-1500" 
                                        value={agendaForm.simultaneousGroupId} 
                                        onChange={e => setAgendaForm({...agendaForm, simultaneousGroupId: e.target.value})} 
                                    />
                                    <p className="text-xs text-surface-dark/40 dark:text-white/40 font-bold ml-1">
                                        Give concurrent sessions the exact same ID so attendees can choose between them.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-surface-dark dark:text-white ml-1">Description (Optional)</label>
                                    <textarea 
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 rounded-xl text-surface-dark dark:text-white focus:outline-none min-h-[100px]"
                                        value={agendaForm.description} 
                                        onChange={e => setAgendaForm({...agendaForm, description: e.target.value})}
                                    />
                                </div>
                                
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="button" variant="ghost" onClick={() => setShowAgendaModal(false)}>Cancel</Button>
                                    <Button type="submit">Save Session</Button>
                                </div>
                            </form>
                        </GlassCard>
                    </div>
                )}
            </div>
        </div>

        <ConfirmModal
            isOpen={!!confirmModal}
            title={confirmModal?.title ?? "Confirm"}
            message={confirmModal?.message ?? ""}
            onConfirm={() => confirmModal?.onConfirm()}
            onCancel={() => setConfirmModal(null)}
            confirmLabel="Delete"
            destructive
        />
        </>
    );
}
