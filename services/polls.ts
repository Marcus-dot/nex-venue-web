import { db } from "@/lib/firebase/config";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    runTransaction,
    updateDoc,
    where,
} from "firebase/firestore";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PollOption {
    id: string;
    text: string;
    votes: string[];
}

export interface Poll {
    id: string;
    eventId: string;
    agendaItemId?: string | null;
    question: string;
    options: PollOption[];
    isActive: boolean;
    showResults: boolean;
    createdAt: number;
    createdBy: string;
    editedAt?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const genId = (len = 8) => Math.random().toString(36).slice(2, 2 + len);

export const pollService = {
    subscribeToEventPolls(
        eventId: string,
        callback: (polls: Poll[]) => void
    ): () => void {
        const q = query(collection(db, "polls"), where("eventId", "==", eventId));
        return onSnapshot(q, (snap) => {
            const polls = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Poll));
            polls.sort((a, b) => a.createdAt - b.createdAt);
            callback(polls);
        });
    },

    async createPoll(
        eventId: string,
        createdBy: string,
        question: string,
        optionTexts: string[]
    ): Promise<string> {
        const options: PollOption[] = optionTexts.map((text) => ({
            id: genId(),
            text: text.trim(),
            votes: [],
        }));
        const ref = await addDoc(collection(db, "polls"), {
            eventId,
            agendaItemId: null,
            question: question.trim(),
            options,
            isActive: true,
            showResults: false,
            createdAt: Date.now(),
            createdBy,
        });
        return ref.id;
    },

    async toggleActive(pollId: string, isActive: boolean): Promise<void> {
        await updateDoc(doc(db, "polls", pollId), { isActive });
    },

    async toggleShowResults(pollId: string, showResults: boolean): Promise<void> {
        await updateDoc(doc(db, "polls", pollId), { showResults });
    },

    async updatePoll(pollId: string, question: string, options: PollOption[]): Promise<void> {
        await updateDoc(doc(db, "polls", pollId), {
            question: question.trim(),
            options,
            editedAt: Date.now(),
        });
    },

    async deletePoll(pollId: string): Promise<void> {
        await deleteDoc(doc(db, "polls", pollId));
    },

    async vote(poll: Poll, optionId: string, userId: string): Promise<void> {
        const ref = doc(db, "polls", poll.id);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) throw new Error("Poll not found");
            const current = snap.data() as Poll;
            const updatedOptions = current.options.map((opt) => ({
                ...opt,
                votes:
                    opt.id === optionId
                        ? opt.votes.includes(userId)
                            ? opt.votes
                            : [...opt.votes, userId]
                        : opt.votes.filter((uid) => uid !== userId),
            }));
            tx.update(ref, { options: updatedOptions });
        });
    },
};
