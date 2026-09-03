import type { Event } from "@/types/events";

/**
 * True once an event's calendar day has fully passed.
 *
 * The data model stores a single `date` (YYYY-MM-DD), so "ended" is measured
 * at day granularity: an event counts as ended only after the end of its date,
 * which avoids flagging a same-day event as over while it may still be running.
 */
export function isEventEnded(event: Pick<Event, "date">): boolean {
    if (!event.date || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return false;
    const endOfDay = new Date(`${event.date}T23:59:59`);
    return endOfDay.getTime() < Date.now();
}
