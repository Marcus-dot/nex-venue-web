"use client";

import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { buildCheckInPayload } from "@/services/checkins";

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    eventTitle: string;
    attendeeName: string;
    uid: string;
    checkedIn?: boolean;
}

export function TicketModal({ isOpen, onClose, eventId, eventTitle, attendeeName, uid, checkedIn }: TicketModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Your ticket">
            <div className="flex flex-col items-center text-center gap-5">
                <div className="bg-white p-4 rounded-2xl deep-shadow">
                    <QRCodeSVG value={buildCheckInPayload(eventId, uid)} size={220} bgColor="#ffffff" fgColor="#111827" level="M" />
                </div>
                <div>
                    <p className="text-xl font-black text-surface-dark dark:text-white">{attendeeName}</p>
                    <p className="text-sm font-medium text-surface-dark/60 dark:text-white/50 mt-1">{eventTitle}</p>
                </div>
                {checkedIn ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-black">
                        <CheckCircle2 size={16} /> Checked in
                    </span>
                ) : (
                    <p className="text-xs font-medium text-surface-dark/55 dark:text-white/40 max-w-xs">
                        Show this code at the entrance. An organiser scans it to check you in.
                    </p>
                )}
            </div>
        </Modal>
    );
}
