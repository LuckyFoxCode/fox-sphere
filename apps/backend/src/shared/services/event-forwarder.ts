import { config } from "../config";
import { Logger } from "./logger.service";

export async function forwardEventToBackend(event: string, data: unknown) {
  try {
    const response = await fetch(
      `http://localhost:${config.port}/api/internal/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, data }),
      },
    );

    if (!response.ok) {
      Logger.error(
        "EventForwarder",
        `Failed to forward ${event}: ${response.statusText}`,
      );
    }
  } catch (error) {
    Logger.error("EventForwarder", `Error forwarding event ${event}`, error);
  }
}
