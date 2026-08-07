export type ConnectionStatus = "pending" | "accepted" | "declined";

export interface ConnectionRequest {
    id: string;
    fromId: string;
    fromName: string;
    fromAvatar: string | null;
    toId: string;
    toName: string;
    status: ConnectionStatus;
    createdAt: number;
    respondedAt?: number;
}
