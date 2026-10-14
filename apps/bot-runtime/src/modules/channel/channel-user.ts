import { NotFoundError, prisma } from "@fox-sphere/backend-shared";
import type { ChannelUser, Viewer } from "@fox-sphere/db";
import { resolveChannelContext } from "./channel-context";

/**
 * The identity half of a balance, upserted by `twitchId`.
 *
 * `Viewer` is who someone is; the coins are the pair's. Splitting them is what lets one person
 * be a different balance in two channels, so every balance write needs this row to exist first -
 * hence it is a separate export rather than a step hidden inside `ensureChannelUser`.
 */
export const ensureViewer = async (
  twitchId: string,
  username: string,
): Promise<Viewer> => {
  const viewer = await prisma.viewer.findUnique({ where: { twitchId } });

  if (!viewer) {
    return await prisma.viewer.create({ data: { twitchId, username } });
  }

  // A Twitch login changes; `twitchId` does not. Comparing before writing keeps an unchanged
  // name from bumping `updatedAt` on every single message.
  if (viewer.username === username) return viewer;

  return await prisma.viewer.update({ where: { twitchId }, data: { username } });
};

/**
 * This channel's balance row for a Twitch id, created on first sight of that viewer.
 *
 * The `Viewer` upsert is not optional and does not go second. `ChannelUser.viewerId` is a
 * foreign key, so a balance row written before its viewer exists is rejected by the constraint
 * on precisely the message that needs it most - the viewer's very first. `ensureUserExists` is
 * the only path that creates a viewer, so "ensure" has to mean both tables here, not one.
 *
 * `created` is what tells the caller whether the "welcome" widgets should fire. It is false
 * for every viewer that Release A's backfill already copied across, so a returning viewer
 * stays silent exactly as they did when this keyed on `User`.
 */
export const ensureChannelUser = async (
  twitchId: string,
  username: string,
): Promise<{ channelUser: ChannelUser; viewer: Viewer; created: boolean }> => {
  const { channelId } = await resolveChannelContext();
  const viewer = await ensureViewer(twitchId, username);

  const existing = await prisma.channelUser.findUnique({
    where: { channelId_viewerId: { channelId, viewerId: viewer.id } },
  });

  if (existing) return { channelUser: existing, viewer, created: false };

  const channelUser = await prisma.channelUser.create({
    data: { channelId, viewerId: viewer.id },
  });

  return { channelUser, viewer, created: true };
};

/**
 * This channel's balance row for a Twitch id, or `null` for someone who has never been here.
 *
 * Read-only on purpose: a spin or a lottery draw for a viewer the backfill never copied must
 * fail loudly at its own call site, not quietly conjure a zeroed balance row in the middle of
 * a transaction. One query rather than two because `twitchId` lives on `Viewer` and the
 * `(channelId, viewerId)` pair is the real key - the same shape the admin panel reads.
 */
export const findChannelUser = async (
  twitchId: string,
): Promise<ChannelUser | null> => {
  const { channelId } = await resolveChannelContext();

  return await prisma.channelUser.findFirst({
    where: { channelId, viewer: { twitchId } },
  });
};

/**
 * `findChannelUser`, for the call sites where "no such viewer" is a bug rather than a state.
 *
 * The message names both identifiers on purpose. A missing row here means the bot was handed a
 * Twitch id it has never seen, and the pair that was searched for is the whole of what is
 * known about it - which is what turns this from `TypeError: Cannot read properties of null`
 * into something an operator can act on.
 */
export const requireChannelUser = async (twitchId: string): Promise<ChannelUser> => {
  const { channelId } = await resolveChannelContext();
  const channelUser = await findChannelUser(twitchId);

  if (!channelUser) {
    throw new NotFoundError(
      `No channel user for twitch id "${twitchId}" in channel "${channelId}". ` +
        `The bot only knows viewers it has seen chat, or that \`backfill:channels\` copied.`,
    );
  }

  return channelUser;
};