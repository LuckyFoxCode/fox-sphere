import { config, Logger, prisma } from "@fox-sphere/backend-shared";

/**
 * The channel this process serves, resolved once and then held.
 *
 * Every `ChannelUser` row and every history row is scoped by `channelId`, and there is no
 * per-message way to learn it: the bot joins one Twitch chat, named by `TWITCH_CHANNEL_NAME`,
 * so for the life of the process the row is a constant. Resolving it in one place turns every
 * later call site into "ask for the context" instead of "look it up again, and decide what to
 * do when it is missing".
 */
export type ChannelContext = {
  channelId: string;
  login: string;
};

/**
 * The in-flight lookup, not the answer.
 *
 * Holding the promise rather than the resolved value means two callers racing on the first
 * message cannot both reach the database - the same "resolved once" the name promises, and it
 * holds under concurrency too. A rejection clears it: a missing `Channel` row is fixed by an
 * operator running a script, not by a retry, but a dropped connection is, and a process that
 * had poisoned its own lookup would turn the second kind into the first.
 */
let pending: Promise<ChannelContext> | null = null;

const lookupChannel = async (): Promise<ChannelContext> => {
  const login = config.twitch.channelName;

  // `Channel.login` is `@unique`, so `findUnique` on it is the entire lookup - no
  // `findFirst`, no OR over `twitchId`. The `select` keeps the row to the two fields the
  // context is made of.
  const channel = await prisma.channel.findUnique({
    where: { login },
    select: { id: true, login: true },
  });

  // Thrown, not returned as `null`. There is no correct downstream behaviour for "no row" -
  // the alternatives are a null dereference in whichever query happens to run first, or a
  // channel that silently is not the one the bot thinks it is. Missing is a misconfiguration,
  // and it has to be loud enough to be fixed without reading any of this code.
  if (!channel) {
    throw new Error(
      `No Channel row for login "${login}" (from TWITCH_CHANNEL_NAME). The bot resolves its ` +
        `channel once at startup and has no way to learn it later, so a missing row is a ` +
        `misconfiguration rather than a state to work around - the bot does not start. Create it ` +
        `with \`pnpm --filter bot-runtime backfill:channels\` (which also copies the legacy ` +
        `balances), or point TWITCH_CHANNEL_NAME at a login that already has one.`,
    );
  }

  // `warn`, not `info`, and that is deliberate: `Logger.info` is silenced under
  // `NODE_ENV=production`, and the acceptance check for the cutover is exactly "the bot
  // starts, and the log names the channel it found" - read off the deployed container's logs
  // after the release, which is where `NODE_ENV=production`. `warn` is the loudest level that
  // is not silenced there. Do not "tidy" this back to `info`: it would be invisible in the one
  // environment where it has to be read. The failure above is a thrown error and so is logged
  // by the startup catch with `Logger.error`, which nothing silences.
  Logger.warn(
    "ChannelContext",
    `Resolved channel "${channel.login}" -> ${channel.id} (from TWITCH_CHANNEL_NAME)`,
  );

  return { channelId: channel.id, login: channel.login };
};

/**
 * The `Channel` row for `TWITCH_CHANNEL_NAME`, or a thrown error naming how to create it.
 *
 * Logs the resolution once per lookup - and the cache is what makes that once per process.
 *
 * This is deliberately not a `ChannelService` - step 5 of phase 1 in
 * `apps/bot-runtime/docs/multi-tenant-architecture.md`, which is a different thing: that one
 * resolves by login / twitchId / overlayKey, caches *parsed per-channel settings*, and offers
 * `invalidate(channelId)` because with 50-500 channels a row changes while the process runs.
 * Here there is one channel and one row with no settings on it, so that class would be a layer
 * of machinery with nothing to hold - and an invalidation contract that silently did nothing.
 * When the second channel arrives, this becomes that service.
 *
 * Nothing invalidates the cache: a `Channel` row that changes mid-process is not seen until
 * the next restart. That is the trade for a single-channel process - the row is configuration,
 * it is read once, and every later reader getting the startup answer is the point.
 */
export const resolveChannelContext = async (): Promise<ChannelContext> => {
  if (pending) return pending;

  pending = lookupChannel().catch((error: unknown) => {
    pending = null;
    throw error;
  });

  return pending;
};