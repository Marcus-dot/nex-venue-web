"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { usersService, type UserRecord } from "@/services/users";
import { adminRequestService, type AdminRequest } from "@/services/adminRequests";
import { GlassCard } from "@/components/ui/GlassCard";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { cn } from "@/lib/utils/cn";
import {
    ArrowLeft,
    Loader2,
    Search,
    Shield,
    Users,
    UserPlus,
    UserMinus,
    Check,
    X,
    Info,
} from "lucide-react";

type Tab = "users" | "requests";

function timeAgo(ts: number) {
    const diffMins = Math.floor((Date.now() - ts) / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
}

export default function UserManagementPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<Tab>("users");
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [pendingRequests, setPendingRequests] = useState<AdminRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        confirmLabel: string;
        destructive?: boolean;
        onConfirm: () => void;
    } | null>(null);

    // ── Admin guard ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.replace("/login?redirect=/users"); return; }
        if (!isAdmin) { router.replace("/profile"); }
    }, [authLoading, user, isAdmin, router]);

    // ── Load users + subscribe to pending admin requests ─────────────────────
    useEffect(() => {
        if (!isAdmin) return;
        let active = true;

        usersService.getAllUsers()
            .then((list) => { if (active) setUsers(list); })
            .catch(() => showToast("Failed to load users.", "error"))
            .finally(() => { if (active) setLoading(false); });

        const unsub = adminRequestService.subscribeToPendingRequests((reqs) => {
            if (active) setPendingRequests(reqs);
        });

        return () => { active = false; unsub(); };
    }, [isAdmin, showToast]);

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) => u.fullName?.toLowerCase().includes(q) || u.phoneNumber?.includes(q));
    }, [users, search]);

    const adminCount = users.filter((u) => u.role === "admin").length;
    const memberCount = users.length - adminCount;

    // ── Role toggle ──────────────────────────────────────────────────────────
    const handleToggleRole = (target: UserRecord) => {
        if (target.uid === user?.uid) {
            showToast("You can't change your own role.", "info");
            return;
        }
        const promote = target.role !== "admin";
        setConfirmModal({
            title: promote ? "Promote to Admin" : "Remove Admin",
            message: `${promote ? "Grant" : "Revoke"} Gralix Admin access for ${target.fullName}? Gralix Admins manage platform users and access requests.`,
            confirmLabel: promote ? "Promote" : "Remove",
            destructive: !promote,
            onConfirm: async () => {
                setConfirmModal(null);
                setUpdatingUserId(target.uid);
                const newRole = promote ? "admin" : "user";
                try {
                    await updateDoc(doc(db, "users", target.uid), { role: newRole });
                    setUsers((prev) => prev.map((u) => (u.uid === target.uid ? { ...u, role: newRole } : u)));
                    showToast(promote ? `${target.fullName} is now an admin.` : `Admin access revoked for ${target.fullName}.`, "success");
                } catch {
                    showToast("Failed to update user role.", "error");
                } finally {
                    setUpdatingUserId(null);
                }
            },
        });
    };

    // ── Admin request review ─────────────────────────────────────────────────
    const handleApprove = (request: AdminRequest) => {
        setConfirmModal({
            title: "Approve Admin Request",
            message: `Grant admin privileges to ${request.userName}?\n\n"${request.reason}"`,
            confirmLabel: "Approve",
            onConfirm: async () => {
                setConfirmModal(null);
                setProcessingRequestId(request.id);
                try {
                    await adminRequestService.approveRequest(request, user!.uid);
                    setUsers((prev) => prev.map((u) => (u.uid === request.userId ? { ...u, role: "admin" } : u)));
                    showToast(`${request.userName} is now an admin.`, "success");
                } catch {
                    showToast("Failed to approve request.", "error");
                } finally {
                    setProcessingRequestId(null);
                }
            },
        });
    };

    const handleReject = (request: AdminRequest) => {
        setConfirmModal({
            title: "Reject Request",
            message: `Decline admin access for ${request.userName}?`,
            confirmLabel: "Reject",
            destructive: true,
            onConfirm: async () => {
                setConfirmModal(null);
                setProcessingRequestId(request.id);
                try {
                    await adminRequestService.rejectRequest(request.id, user!.uid);
                    showToast(`Request from ${request.userName} declined.`, "success");
                } catch {
                    showToast("Failed to reject request.", "error");
                } finally {
                    setProcessingRequestId(null);
                }
            },
        });
    };

    if (authLoading || (!isAdmin && !user)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#0f101e]">
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        );
    }
    if (!isAdmin) return null;

    const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
        { id: "users", label: "All Users", icon: Users },
        { id: "requests", label: "Requests", icon: Shield, badge: pendingRequests.length },
    ];

    return (
        <>
            <div className="min-h-screen bg-background dark:bg-[#0f101e] px-6 md:px-8 py-12">
                <div className="max-w-3xl mx-auto">
                    <Link href="/profile" className="flex items-center gap-2 text-surface-dark/60 dark:text-white/60 hover:text-accent font-medium mb-8">
                        <ArrowLeft size={20} /> Back to Profile
                    </Link>

                    <h1 className="text-4xl font-black text-surface-dark dark:text-white mb-2 tracking-tight">User Management</h1>
                    <p className="text-surface-dark/60 dark:text-white/60 font-medium mb-8">Audit platform members and review admin access requests.</p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[
                            { label: "Admins", value: adminCount, accent: true },
                            { label: "Members", value: memberCount },
                            { label: "Total", value: users.length },
                        ].map((s) => (
                            <GlassCard key={s.label} className="!p-4 text-center">
                                <div className={cn("text-3xl font-black", s.accent ? "text-accent" : "text-surface-dark dark:text-white")}>{s.value}</div>
                                <div className="text-xs font-bold text-surface-dark/55 dark:text-white/40 mt-1">{s.label}</div>
                            </GlassCard>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-surface-dark/5 dark:bg-white/5 p-1.5 rounded-2xl mb-8 w-full max-w-sm">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-sm",
                                    activeTab === tab.id
                                        ? "bg-white dark:bg-white/10 text-accent shadow-sm"
                                        : "text-surface-dark/55 dark:text-white/40 hover:text-surface-dark dark:hover:text-white"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {!!tab.badge && tab.badge > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-black flex items-center justify-center">
                                        {tab.badge > 9 ? "9+" : tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={36} /></div>
                    ) : activeTab === "users" ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Search */}
                            <div className="flex items-center gap-3 rounded-2xl px-4 h-12 bg-surface-dark/5 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10 mb-2">
                                <Search size={17} className="text-surface-dark/55 dark:text-white/40 shrink-0" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name or phone…"
                                    className="flex-1 bg-transparent outline-none text-surface-dark dark:text-white font-medium placeholder:text-surface-dark/45 dark:placeholder:text-white/30"
                                />
                            </div>

                            {filteredUsers.length === 0 ? (
                                <div className="text-center py-16 text-surface-dark/55 dark:text-white/40 font-medium">
                                    {search ? "No users match your search." : "No users yet."}
                                </div>
                            ) : (
                                filteredUsers.map((u) => {
                                    const isSelf = u.uid === user?.uid;
                                    const isUpdating = updatingUserId === u.uid;
                                    const admin = u.role === "admin";
                                    return (
                                        <GlassCard key={u.uid} className="!p-4 flex items-center gap-4">
                                            <AvatarDisplay avatarUrl={u.avatar} fullName={u.fullName} size={44} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-surface-dark dark:text-white truncate">{u.fullName || "Unknown"}</span>
                                                    {isSelf && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-accent text-white">You</span>}
                                                </div>
                                                <p className="text-sm text-surface-dark/55 dark:text-white/40 font-medium truncate">{u.phoneNumber || "No phone"}</p>
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black",
                                                        admin ? "bg-accent/10 text-accent" : "bg-surface-dark/5 dark:bg-white/5 text-surface-dark/60 dark:text-white/50"
                                                    )}
                                                >
                                                    <Shield size={11} /> {admin ? "Gralix Admin" : "Member"}
                                                </span>
                                            </div>
                                            {!isSelf && (
                                                <button
                                                    onClick={() => handleToggleRole(u)}
                                                    disabled={isUpdating}
                                                    className={cn(
                                                        "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-colors disabled:opacity-50",
                                                        admin
                                                            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                                            : "bg-accent/10 text-accent hover:bg-accent/20"
                                                    )}
                                                >
                                                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : admin ? <UserMinus size={14} /> : <UserPlus size={14} />}
                                                    {admin ? "Remove" : "Make admin"}
                                                </button>
                                            )}
                                        </GlassCard>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {pendingRequests.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 rounded-2xl bg-surface-dark/5 dark:bg-white/5 flex items-center justify-center text-surface-dark/20 dark:text-white/20 mx-auto mb-4">
                                        <Shield size={30} />
                                    </div>
                                    <p className="font-black text-surface-dark dark:text-white mb-1">No pending requests</p>
                                    <p className="text-sm text-surface-dark/55 dark:text-white/40 font-medium">Admin access requests will appear here.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start gap-2 rounded-xl px-4 py-3 bg-accent/5 border border-accent/15 mb-2">
                                        <Info size={15} className="text-accent shrink-0 mt-0.5" />
                                        <p className="text-xs font-medium text-accent leading-relaxed">Review each request carefully. Approved users get full platform admin access.</p>
                                    </div>
                                    {pendingRequests.map((req) => {
                                        const busy = processingRequestId === req.id;
                                        return (
                                            <GlassCard key={req.id} className="!p-5">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-11 h-11 rounded-full flex items-center justify-center font-black bg-amber-500/15 text-amber-500 shrink-0">
                                                        {req.userName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-black text-surface-dark dark:text-white truncate">{req.userName}</div>
                                                        <div className="text-sm text-surface-dark/55 dark:text-white/40 font-medium truncate">{req.userPhone}</div>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500">Pending</span>
                                                </div>
                                                <div className="rounded-xl p-3 bg-surface-dark/5 dark:bg-white/5 mb-3">
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-surface-dark/45 dark:text-white/30 mb-1">Reason</div>
                                                    <p className="text-sm text-surface-dark dark:text-white leading-relaxed">{req.reason}</p>
                                                </div>
                                                <div className="text-xs text-surface-dark/45 dark:text-white/30 font-medium mb-4">Requested {timeAgo(req.timestamp)}</div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleReject(req)}
                                                        disabled={busy}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 font-black text-sm transition-colors disabled:opacity-50"
                                                    >
                                                        <X size={15} /> Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(req)}
                                                        disabled={busy}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 font-black text-sm transition-colors disabled:opacity-50"
                                                    >
                                                        {busy ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Approve</>}
                                                    </button>
                                                </div>
                                            </GlassCard>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {confirmModal && (
                <ConfirmModal
                    isOpen={true}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmLabel={confirmModal.confirmLabel}
                    destructive={confirmModal.destructive}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </>
    );
}
