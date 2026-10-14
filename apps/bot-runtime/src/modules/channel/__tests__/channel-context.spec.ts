import { beforeEach, describe, expect, it, vi } from "vitest";
import { config, prisma } from "@fox-sphere/backend-shared";
import { resetDb } from "../../../__tests__/helpers/test-db";

// The context is cached at module scope, so every test needs its own copy of the module:
// `vi.resetModules()` drops the registry entry and the dynamic `import` rebuilds it. That
// also rebuilds `@fox-sphere/backend-shared` underneath it, hence a second Prisma client -
// and a second connection pool - for the same database. Which is harmless here: both clients
// are pointed at `config.databaseUrl`, the guard on `resetDb()` is about which database that
// is rather than about how many clients are watching it, and a file this short leaks a
// handful of pools into a throwaway database.
const freshResolver = async () => {
  vi.resetModules();
  return await import("../channel-context");
};

const seedChannel = async (login: string) =>
  await prisma.channel.create({
    data: { twitchId: `twitch_${login}`, login, displayName: login, status: "ACTIVE" },
  });

describe("resolveChannelContext", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("resolves the Channel row that TWITCH_CHANNEL_NAME names", async () => {
    const channel = await seedChannel(config.twitch.channelName);
    const { resolveChannelContext } = await freshResolver();

    await expect(resolveChannelContext()).resolves.toEqual({
      channelId: channel.id,
      login: config.twitch.channelName,
    });
  });

  // Not a `vi.spyOn` on `findUnique`: after `resetModules()` the module under test holds
  // its own Prisma client, so the spy would sit on an instance the resolver never calls.
  // Deleting the row underneath a resolved context is the same claim stated behaviourally
  // - a second lookup would find nothing and throw, so a returned context proves it did
  // not happen.
  it("does not reach the database again once it has resolved", async () => {
    const channel = await seedChannel(config.twitch.channelName);
    const { resolveChannelContext } = await freshResolver();

    const first = await resolveChannelContext();
    await prisma.channel.delete({ where: { id: channel.id } });

    await expect(resolveChannelContext()).resolves.toEqual(first);
  });

  it("throws a message that names the variable and the script that creates the row", async () => {
    const { resolveChannelContext } = await freshResolver();

    await expect(resolveChannelContext()).rejects.toThrow(
      new RegExp(
        `No Channel row for login "${config.twitch.channelName}".*TWITCH_CHANNEL_NAME.*backfill:channels`,
        "s",
      ),
    );
  });

  // The counterpart of the module cache: a *failure* must not be cached, or one dropped
  // connection at startup would leave the process permanently unable to resolve its
  // channel for reasons that have nothing to do with the row being there.
  it("does not cache a failed lookup", async () => {
    const { resolveChannelContext } = await freshResolver();

    await expect(resolveChannelContext()).rejects.toThrow("No Channel row");

    const channel = await seedChannel(config.twitch.channelName);
    await expect(resolveChannelContext()).resolves.toEqual({
      channelId: channel.id,
      login: config.twitch.channelName,
    });
  });

  // The acceptance check for the cutover is read off the deployed container's logs, where
  // `NODE_ENV=production` - and `Logger.info` is silenced there. So the line that reports
  // the resolved channel has to survive that setting, and this is the test that says so:
  // changing the call back to `Logger.info` silences it and turns this red.
  it("reports the resolved channel even under NODE_ENV=production", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      await seedChannel(config.twitch.channelName);
      const { resolveChannelContext } = await freshResolver();

      await resolveChannelContext();

      // Only `console.warn` is asserted: Prisma writes its own query log to `console.log`, so
      // "nothing was logged" is not available as a signal. The regression this pins is
      // precise anyway - `Logger.info` under `NODE_ENV=production` writes to neither stream,
      // so moving the call back to `info` empties this string and turns the test red.
      const warned = warn.mock.calls.map((call) => call.join(" ")).join("\n");
      expect(warned).toContain(`Resolved channel "${config.twitch.channelName}"`);
    } finally {
      warn.mockRestore();
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });
});