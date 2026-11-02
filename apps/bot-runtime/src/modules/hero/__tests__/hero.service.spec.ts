import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@fox-sphere/backend-shared";
import { getDefaultHero } from "@fox-sphere/types";
import { resetDb } from "../../../__tests__/helpers/test-db";
import {
  seedOtherChannel,
  seedTestChannel,
  TEST_CHANNEL_ID,
} from "../../../__tests__/helpers/seed";
import { HeroService } from "../hero.service";

const TWITCH_ID = "twitch_111";

const seedChannelUser = async (channelId: string, twitchId: string, username: string) => {
  const viewer = await prisma.viewer.create({ data: { twitchId, username } });
  const channelUser = await prisma.channelUser.create({
    data: { channelId, viewerId: viewer.id },
  });
  return channelUser;
};

describe("HeroService on ChannelUser", () => {
  beforeEach(async () => {
    await resetDb();
    await seedTestChannel();
  });

  it("files the hero under the channel and the balance row it was passed", async () => {
    const channelUser = await seedChannelUser(TEST_CHANNEL_ID, TWITCH_ID, "alice");

    const heroId = await new HeroService().ensureUserHasHero(
      channelUser.id,
      TEST_CHANNEL_ID,
    );

    expect(heroId).toBe(getDefaultHero().id);

    const hero = await prisma.userHero.findFirstOrThrow();
    // Both halves, because `UserHero.channelId` is a plain column beside the relation: a row
    // written with only `channelUserId` would say whose hero it is and not whose stream.
    expect(hero.channelUserId).toBe(channelUser.id);
    expect(hero.channelId).toBe(TEST_CHANNEL_ID);
    expect(hero.heroId).toBe(heroId);
    expect(hero.isActive).toBe(true);
  });

  it("returns the existing hero instead of writing a second row", async () => {
    const channelUser = await seedChannelUser(TEST_CHANNEL_ID, TWITCH_ID, "alice");
    const service = new HeroService();

    const first = await service.ensureUserHasHero(channelUser.id, TEST_CHANNEL_ID);
    const second = await service.ensureUserHasHero(channelUser.id, TEST_CHANNEL_ID);

    expect(second).toBe(first);
    expect(await prisma.userHero.count()).toBe(1);
    expect((await prisma.userHero.findFirstOrThrow()).isActive).toBe(true);
  });

  it("activates an owned hero when the viewer has rows but none active", async () => {
    const channelUser = await seedChannelUser(TEST_CHANNEL_ID, TWITCH_ID, "alice");
    // Окно деплоя: строки уже есть, флага нет ни у одной.
    await prisma.userHero.create({
      data: { channelUserId: channelUser.id, channelId: TEST_CHANNEL_ID, heroId: "thug" },
    });
    // Один из купленных - дефолтный герой, и лечение обязано выбрать именно его: без него
    // ответ зависел бы от порядка `findMany`, то есть от того, что зритель купил первым.
    await prisma.userHero.create({
      data: {
        channelUserId: channelUser.id,
        channelId: TEST_CHANNEL_ID,
        heroId: getDefaultHero().id,
      },
    });

    const heroId = await new HeroService().ensureUserHasHero(
      channelUser.id,
      TEST_CHANNEL_ID,
    );

    expect(heroId).toBe(getDefaultHero().id);
    expect(await prisma.userHero.count()).toBe(2);
    expect(
      await prisma.userHero.count({
        where: { channelUserId: channelUser.id, isActive: true },
      }),
    ).toBe(1);
    expect(
      (
        await prisma.userHero.findFirstOrThrow({
          where: { channelUserId: channelUser.id, isActive: true },
        })
      ).heroId,
    ).toBe(getDefaultHero().id);
  });

  it("gives the same viewer a separate hero row per channel", async () => {
    const otherChannelId = await seedOtherChannel();
    const viewer = await prisma.viewer.create({
      data: { twitchId: TWITCH_ID, username: "alice" },
    });
    const here = await prisma.channelUser.create({
      data: { channelId: TEST_CHANNEL_ID, viewerId: viewer.id },
    });
    const there = await prisma.channelUser.create({
      data: { channelId: otherChannelId, viewerId: viewer.id },
    });

    const service = new HeroService();
    await service.ensureUserHasHero(here.id, TEST_CHANNEL_ID);
    await service.ensureUserHasHero(there.id, otherChannelId);

    const heroes = await prisma.userHero.findMany();
    expect(heroes).toHaveLength(2);
    expect(heroes.map((row) => row.channelId).sort()).toEqual(
      [TEST_CHANNEL_ID, otherChannelId].sort(),
    );
  });

  it("sweeps only this channel's viewers", async () => {
    const otherChannelId = await seedOtherChannel();
    const here = await seedChannelUser(TEST_CHANNEL_ID, TWITCH_ID, "alice");
    const there = await seedChannelUser(otherChannelId, "twitch_222", "bob");

    await new HeroService().assignHeroToExistingUsersWithoutOne();

    const heroes = await prisma.userHero.findMany();
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.channelUserId).toBe(here.id);
    expect(
      await prisma.userHero.count({ where: { channelUserId: there.id } }),
    ).toBe(0);
  });

  it("leaves a viewer who already has a hero alone", async () => {
    const channelUser = await seedChannelUser(TEST_CHANNEL_ID, TWITCH_ID, "alice");
    await new HeroService().ensureUserHasHero(channelUser.id, TEST_CHANNEL_ID);

    await new HeroService().assignHeroToExistingUsersWithoutOne();

    expect(await prisma.userHero.count()).toBe(1);
  });
});