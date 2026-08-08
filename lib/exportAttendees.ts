import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import type { Event } from "@/types/events";
import type { UserProfile } from "@/types/auth";

export interface AttendeeRow {
    fullName: string;
    phoneNumber: string;
    email: string;
    role: string;
    networking: string;
}

/** Highest-precedence event role a uid holds. */
const roleFor = (event: Event, uid: string): string => {
    if (event.creatorId === uid) return "Creator";
    if (event.organisers?.includes(uid)) return "Organiser";
    if (event.speakers?.includes(uid)) return "Speaker";
    if (event.exhibitors?.includes(uid)) return "Exhibitor";
    return "Attendee";
};

const NETWORKING_LABEL: Record<string, string> = {
    open: "Open",
    selective: "Selective",
    not_available: "Not available",
};

/**
 * Resolve every participant on an event (attendees + staff, deduped) to an
 * export row by batch-loading their user profiles.
 */
export const fetchAttendeeRows = async (event: Event): Promise<AttendeeRow[]> => {
    const uids = Array.from(new Set([
        ...(event.attendees ?? []),
        ...(event.organisers ?? []),
        ...(event.speakers ?? []),
        ...(event.exhibitors ?? []),
    ]));
    if (uids.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));

    const snaps = await Promise.all(
        chunks.map((chunk) =>
            getDocs(query(collection(db, "users"), where(documentId(), "in", chunk)))
        )
    );

    const rows = snaps.flatMap((snap) =>
        snap.docs.map((d) => {
            const p = d.data() as UserProfile;
            return {
                fullName: p.fullName || "",
                phoneNumber: p.phoneNumber || "",
                email: p.email || "",
                role: roleFor(event, d.id),
                networking: p.networkingAvailability ? (NETWORKING_LABEL[p.networkingAvailability] ?? "") : "",
            };
        })
    );

    // Staff first, then alphabetical.
    const rank: Record<string, number> = { Creator: 0, Organiser: 1, Speaker: 2, Exhibitor: 3, Attendee: 4 };
    return rows.sort((a, b) =>
        (rank[a.role] - rank[b.role]) || a.fullName.localeCompare(b.fullName)
    );
};

/** Build a CSV string (mirrors the mobile attendee export columns). */
export const buildAttendeeCSV = (eventTitle: string, rows: AttendeeRow[]): string => {
    const escape = (val: string | null | undefined) => `"${(val ?? "").replace(/"/g, '""')}"`;
    const header = ["Full Name", "Phone", "Email", "Role", "Networking"].map(escape).join(",");
    const body = rows.map((r) =>
        [r.fullName, r.phoneNumber, r.email, r.role, r.networking].map(escape).join(",")
    );
    return [`NexVenue Export - ${eventTitle}`, header, ...body].join("\n");
};

/** Trigger a client-side CSV download. */
export const downloadCSV = (filename: string, content: string): void => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
