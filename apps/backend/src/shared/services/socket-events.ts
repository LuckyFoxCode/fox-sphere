import type { Winner } from "@fox-sphere/shared-schemas";

export interface ServerToClientEvents {
	"lottery:started": (duration: number) => void;
	"lottery:winner-drawn": (winner: Winner) => void;
	"lottery:finished": (data: { winners: Winner[] }) => void;
}

export interface ClientToServerEvents {
	clientToServerEvent: (blabla: number) => void; //TODO: заменить на нормальные когда понадобится
}
