import { config, prisma } from "@fox-sphere/backend-shared";

/**
 * The one `Channel` row every database-backed spec in this package runs against.
 *
 * A fixed id, not `create`-per-test: `resolveChannelContext` resolves the channel once and
 * holds the answer at module scope for the life of the module, which is what production does
 * for the life of the process. `resetDb()` truncates the row away between tests, so a spec
 * that seeded a fresh `Channel` each time would leave the cached `channelId` pointing at
 * nothing - and every test after the first would fail for a reason that has nothing to do
 * with what it is testing. Re-seeding the SAME id makes the truncated row come back as the one
 * the process already believes in, exactly as a restart would.
 *
 * The login is the real `config.twitch.channelName`, because that is the string
 * `resolveChannelContext` looks up.
 */
export const TEST_CHANNEL_ID = "channel_test_channel";

export const seedTestChannel = async (): Promise<string> => {
  const login = config.twitch.channelName;

  await prisma.channel.create({
    data: {
      id: TEST_CHANNEL_ID,
      twitchId: `twitch_${login}`,
      login,
      displayName: login,
      status: "ACTIVE",
    },
  });

  return TEST_CHANNEL_ID;
};

/**
 * A second channel, for the tests that have to prove a key or a query carries the channel at
 * all. Never named by `TWITCH_CHANNEL_NAME`, so nothing resolves to it by accident - it exists
 * to be *filtered out*.
 */
export const seedOtherChannel = async (): Promise<string> => {
  await prisma.channel.create({
    data: {
      id: "channel_other",
      twitchId: "twitch_other",
      login: "other_channel",
      displayName: "other_channel",
      status: "ACTIVE",
    },
  });

  return "channel_other";
};