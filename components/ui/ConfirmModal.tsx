"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    message: string;
    title?: string;
    confirmLabel?: string;
    destructive?: boolean;
}

export const ConfirmModal = ({
    isOpen,
    onConfirm,
    onCancel,
    message,
    title = "Confirm Action",
    confirmLabel = "Confirm",
    destructive = false,
}: ConfirmModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title}>
            <p className="text-surface-dark/70 dark:text-white/70 font-medium mb-8 leading-relaxed">
                {message}
            </p>
            <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    onClick={onConfirm}
                    className={destructive ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : ""}
                >
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
};
