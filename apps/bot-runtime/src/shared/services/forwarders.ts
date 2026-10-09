import { Logger } from "@fox-sphere/backend-shared";
import type { AppEvents } from "./event-bus.service";
import { globalEventBus } from "./event-bus.service";
import { forwardEventToBackend } from "./event-forwarder";

const LOG_CONTEXT = "Bootstrap";

type ForwarderLogLevel = "debug" | "info";

interface Forwarder {
  register(): void;
}

/**
 * Every entry becomes one `globalEventBus.on(...)` that logs and forwards to the
 * backend, which is what performs the `io.emit` to the overlay.
 *
 * `forward()` is a builder rather than a bare table object because the bus is
 * typed per event: a plain object literal typed as a union of "one shape per
 * event" loses the pairing between `busEvent` and its payload, and the only ways
 * back are an `any` or an `as`. Building here keeps `describe`'s parameter
 * narrowed to the one event it describes, so a renamed field is a type error at
 * the entry that logs it.
 */
const forward = <K extends keyof AppEvents>(
  busEvent: K,
  describe: (data: AppEvents[K]) => string,
  level: ForwarderLogLevel,
  forwardAs: string = busEvent,
  sendData = true,
): Forwarder => ({
  register(): void {
    globalEventBus.on(busEvent, async (data) => {
      if (level === "debug") {
        Logger.debug(LOG_CONTEXT, describe(data));
      } else {
        Logger.info(LOG_CONTEXT, describe(data));
      }

      if (sendData) {
        await forwardEventToBackend(forwardAs, data);
      } else {
        await forwardEventToBackend(forwardAs);
      }
    });
  },
});

const FORWARDERS: readonly Forwarder[] = [
  forward(
    "chat:message",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding chat message to overlay | User: ${data.displayName}`,
    "debug",
  ),
  forward(
    "lottery:participants",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Lottery participants loaded: ${data?.length ?? 0}`,
    "info",
  ),
  forward(
    "lottery:ticket-earned",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Ticket earned | User: ${data.username}`,
    "info",
  ),
  forward(
    "lottery:started",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Lottery command triggered! Total duration: ${data.duration}s. Forwarding to overlay...`,
    "info",
  ),
  forward(
    "lottery:winners",
    () => `.𖥔 ݁ ˖ִ🛸༄˖°. Lottery winners...`,
    "info",
  ),
  forward(
    "lottery:winner-drawn",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Победитель #${data.place} объявлен в чате, шлем на оверлей!`,
    "info",
  ),
  forward(
    "lottery:finished",
    () =>
      ".𖥔 ݁ ˖ִ🛸༄˖°. Lottery finished event captured, forwarding to Socket.io via Backend!",
    "info",
  ),
  // Долг: глобальный broadcast — phase-1 multi-tenancy переведёт на per-channel rooms.
  forward(
    "roulette:spun",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding roulette spin result to overlay | User: ${data.username}, Prize: ${data.prizeType}`,
    "info",
    "roulette:spin-result",
  ),
  forward(
    "hero:assigned",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding hero:assigned to overlay for: ${data.username}`,
    "info",
  ),
  forward(
    "stream:level-up",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding stream level-up to overlay |  New Level: ${data.lvl}`,
    "info",
  ),
  forward(
    "stream:xp-updated",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding stream newXp to overlay |  New exp: ${data.newXp} / ${data.maxXp}`,
    "debug",
  ),
  forward(
    "stream:xp-boost",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding xp boost to overlay | Multiplier: ×${data.multiplier}`,
    "info",
  ),
  // Долг: глобальный broadcast — phase-1 multi-tenancy переведёт на per-channel rooms.
  forward(
    "stream:jackpot-updated",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding jackpot update to overlay | New total: ${data.jackpotTotal}`,
    "info",
  ),
  forward(
    "twitch:add-vip",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding twitch:add-vip to overlay for: ${data.username}`,
    "info",
  ),
  forward(
    "twitch:follow",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding twitch:follow to overlay for: ${data.username}`,
    "info",
  ),
  forward(
    "twitch:raid",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding twitch:raid to overlay from: ${data.raiderName}`,
    "info",
  ),
  forward(
    "twitch:reward-redeem",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding reward-redeem to overlay: ${data.rewardTitle}`,
    "info",
  ),
  forward(
    "twitch:timer",
    () => `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding timer to overlay`,
    "info",
  ),
  forward(
    "twitch:timer-stop",
    () => `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding timer to overlay`,
    "info",
    "twitch:timer-stop",
    false,
  ),
  forward(
    "twitch:watch-streak",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding watch-streak to overlay for: ${data.username}, streak: ${data.streakValue}`,
    "info",
  ),
  forward(
    "user:level-up",
    (data) =>
      `.𖥔 ݁ ˖ִ🛸༄˖°. Forwarding level-up to overlay | User: ${data.username}, New Level: ${data.newLevel}`,
    "info",
  ),
];

export const registerEventForwarders = (): void => {
  for (const forwarder of FORWARDERS) {
    forwarder.register();
  }
};
