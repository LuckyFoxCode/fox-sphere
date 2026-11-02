import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@fox-sphere/backend-shared";
import { getDefaultHero, getHeroById } from "@fox-sphere/types";
import { resetDb } from "../../../__tests__/helpers/test-db";
import {
  seedOtherChannel,
  seedTestChannel,
  TEST_CHANNEL_ID,
} from "../../../__tests__/helpers/seed";
import { HeroService } from "../hero.service";

const TWITCH_ID = "twitch_111";

const seedChannelUser = async (coins = 0) => {
  const viewer = await prisma.viewer.create({
    data: { twitchId: TWITCH_ID, username: "alice" },
  });

  return prisma.channelUser.create({
    data: { channelId: TEST_CHANNEL_ID, viewerId: viewer.id, coins },
  });
};

describe("HeroService.equipHero", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();
  });

  it("moves the active flag to the newly equipped hero", async () => {
    const channelUser = await seedChannelUser(1000);
    const service = new HeroService();
    await service.ensureUserHasHero(channelUser.id, TEST_CHANNEL_ID); // assassin, активный
    await service.buyHero(TWITCH_ID, getHeroById("robber")); // robber, неактивный

    expect(await service.equipHero(TWITCH_ID, "robber")).toBe("equipped");

    const rows = await prisma.userHero.findMany({ where: { isActive: true } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.heroId).toBe("robber");
  });

  it("reports a hero that is already active without rewriting it", async () => {
    await seedChannelUser(0);
    const service = new HeroService();
    const channelUser = await prisma.channelUser.findFirstOrThrow();
    await service.ensureUserHasHero(channelUser.id, TEST_CHANNEL_ID);
    const before = await prisma.userHero.findFirstOrThrow();

    expect(await service.equipHero(TWITCH_ID, getDefaultHero().id)).toBe("already-active");
    expect((await prisma.userHero.findFirstOrThrow()).updatedAt).toEqual(before.updatedAt);
  });

  it("refuses a hero the viewer does not own and keeps the active one", async () => {
    await seedChannelUser(0);
    const service = new HeroService();
    const channelUser = await prisma.channelUser.findFirstOrThrow();
    await service.ensureUserHasHero(channelUser.id, TEST_CHANNEL_ID);

    expect(await service.equipHero(TWITCH_ID, "thug")).toBe("not-owned");
    expect((await prisma.userHero.findFirstOrThrow()).heroId).toBe(getDefaultHero().id);
  });

  it("keeps two channels' active heroes independent", async () => {
    const otherChannelId = await seedOtherChannel();
    const viewer = await prisma.viewer.create({
      data: { twitchId: TWITCH_ID, username: "alice" },
    });
    const here = await prisma.channelUser.create({
      data: { channelId: TEST_CHANNEL_ID, viewerId: viewer.id, coins: 1000 },
    });
    const there = await prisma.channelUser.create({
      data: { channelId: otherChannelId, viewerId: viewer.id, coins: 1000 },
    });

    const service = new HeroService();
    await service.ensureUserHasHero(here.id, TEST_CHANNEL_ID);
    await service.ensureUserHasHero(there.id, otherChannelId);

    await prisma.userHero.create({
      data: { channelUserId: here.id, channelId: TEST_CHANNEL_ID, heroId: "thug" },
    });

    expect(await service.equipHero(TWITCH_ID, "thug")).toBe("equipped");

    const hereRows = await prisma.userHero.findMany({ where: { channelUserId: here.id } });
    const thereRows = await prisma.userHero.findMany({ where: { channelUserId: there.id } });

    expect(hereRows.filter((row) => row.isActive).map((row) => row.heroId)).toEqual(["thug"]);
    expect(thereRows.filter((row) => row.isActive).map((row) => row.heroId)).toEqual([
      getDefaultHero().id,
    ]);
    expect(thereRows).toHaveLength(1);
  });
});
