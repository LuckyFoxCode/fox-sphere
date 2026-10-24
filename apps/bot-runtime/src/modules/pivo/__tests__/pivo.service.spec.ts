import { prisma } from "@fox-sphere/backend-shared";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../__tests__/helpers/test-db";
import { seedTestChannel } from "../../../__tests__/helpers/seed";
import { ensureChannelUser } from "../../channel";
import { PivoService } from "../pivo.service";

const TWITCH_ID = "pivo_1";
const USERNAME = "pivo_1";

const golden = () => new PivoService(() => "golden");
const regular = () => new PivoService(() => "regular");

// `seedTestChannel` rather than a `prisma.channel.create`: `resolveChannelContext` caches the
// channel at module scope, so every spec in this package has to re-seed the SAME id that
// `resetDb()` truncated. `ensureChannelUser` is how a balance row comes into being.
const seed = async (goldenBeers: number) => {
  await seedTestChannel();
  const { channelUser } = await ensureChannelUser(TWITCH_ID, USERNAME);

  if (goldenBeers !== 0) {
    await prisma.channelUser.update({ where: { id: channelUser.id }, data: { goldenBeers } });
  }
};

const countOf = async () =>
  (await prisma.channelUser.findFirstOrThrow({ where: { viewer: { twitchId: TWITCH_ID } } }))
    .goldenBeers;

describe("PivoService", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("writes nothing on a regular roll", async () => {
    await seed(0);

    expect(await regular().roll(TWITCH_ID)).toEqual({ outcome: "regular" });
    expect(await countOf()).toBe(0);
  });

  it("increments the counter and reports tier 1 on the first golden beer", async () => {
    await seed(0);

    expect(await golden().roll(TWITCH_ID)).toEqual({
      outcome: "golden",
      goldenBeers: 1,
      tier: 1,
      isNewTier: true,
    });
    expect(await countOf()).toBe(1);
  });

  it("reports isNewTier exactly on the drop that crosses a threshold", async () => {
    await seed(1); // одна уже выбита, порог второй ступени — 2

    expect(await golden().roll(TWITCH_ID)).toMatchObject({ goldenBeers: 2, isNewTier: true });
    expect(await golden().roll(TWITCH_ID)).toMatchObject({ goldenBeers: 3, isNewTier: false });
  });

  it("stays on tier 5 past the top threshold", async () => {
    await seed(13);

    expect(await golden().roll(TWITCH_ID)).toEqual({
      outcome: "golden",
      goldenBeers: 14,
      tier: 5,
      isNewTier: false,
    });
  });

  it("throws a named error and writes nothing for a viewer with no row", async () => {
    await seedTestChannel();

    await expect(golden().roll("pivo_ghost")).rejects.toThrow(/pivo_ghost/);
    expect(await prisma.channelUser.count()).toBe(0);
  });
});
