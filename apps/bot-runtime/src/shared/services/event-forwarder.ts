import { config, Logger } from "@fox-sphere/backend-shared";

export async function forwardEventToBackend(
  event: string,
  data: Record<string, unknown> | unknown = {},
) {
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
      // statusText alone is "Bad Request" - the body is the part that says why.
      const body = await response.text().catch(() => "");
      Logger.error(
        "EventForwarder",
        `Failed to forward ${event}: ${response.status} ${response.statusText} ${body}`.trim(),
      );
    }
  } catch (error) {
    Logger.error("EventForwarder", `Error forwarding event ${event}`, error);
  }
}
