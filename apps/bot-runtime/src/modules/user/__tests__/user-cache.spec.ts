import { describe, expect, it } from "vitest";
import { UserCache } from "../user-cache";

const CHANNEL_A = "channel_a";
const CHANNEL_B = "channel_b";
const TWITCH_ID = "twitch_111";
const NOW = 1_000_000;

/**
 * The cache is the one place in the bot where a wrong key produces wrong *money* silently:
 * nothing fails, one stream simply shows another's balance. So this file asserts the shape of
 * the key rather than the behaviour of an entry - a test that only checked "a value comes back"
 * would still pass with a bare `twitchId`.
 */
describe("UserCache keys carry the channel", () => {
  it("keeps coins for the same viewer in two channels apart", () => {
    const cache = new UserCache();

    cache.setCoins(CHANNEL_A, TWITCH_ID, 100, NOW);
    cache.setCoins(CHANNEL_B, TWITCH_ID, 9_000, NOW);

    expect(cache.getCoins(CHANNEL_A, TWITCH_ID, NOW)).toBe(100);
    expect(cache.getCoins(CHANNEL_B, TWITCH_ID, NOW)).toBe(9_000);
  });

  it("invalidates coins in one channel without touching the other", () => {
    const cache = new UserCache();

    cache.setCoins(CHANNEL_A, TWITCH_ID, 100, NOW);
    cache.setCoins(CHANNEL_B, TWITCH_ID, 9_000, NOW);

    cache.invalidateCoins(CHANNEL_A, TWITCH_ID);

    expect(cache.getCoins(CHANNEL_A, TWITCH_ID, NOW)).toBeUndefined();
    expect(cache.getCoins(CHANNEL_B, TWITCH_ID, NOW)).toBe(9_000);
  });

  it("keeps heroes for the same viewer in two channels apart", () => {
    const cache = new UserCache();

    cache.setHero(CHANNEL_A, TWITCH_ID, "hero_a", NOW);
    cache.setHero(CHANNEL_B, TWITCH_ID, "hero_b", NOW);

    expect(cache.getHero(CHANNEL_A, TWITCH_ID, NOW)).toBe("hero_a");
    expect(cache.getHero(CHANNEL_B, TWITCH_ID, NOW)).toBe("hero_b");

    cache.invalidateHero(CHANNEL_A, TWITCH_ID);

    expect(cache.getHero(CHANNEL_A, TWITCH_ID, NOW)).toBeUndefined();
    expect(cache.getHero(CHANNEL_B, TWITCH_ID, NOW)).toBe("hero_b");
  });

  it("does not let one channel's verified set vouch for another's", () => {
    const cache = new UserCache();

    cache.markVerified(CHANNEL_A, TWITCH_ID);

    expect(cache.isVerified(CHANNEL_A, TWITCH_ID)).toBe(true);
    expect(cache.isVerified(CHANNEL_B, TWITCH_ID)).toBe(false);
  });

  it("does not spend another channel's message cooldown", () => {
    const cache = new UserCache();

    cache.setLastXpAt(CHANNEL_A, TWITCH_ID, NOW);
    cache.setLastLotteryXpAt(CHANNEL_A, TWITCH_ID, NOW);

    expect(cache.getLastXpAt(CHANNEL_A, TWITCH_ID)).toBe(NOW);
    expect(cache.getLastXpAt(CHANNEL_B, TWITCH_ID)).toBe(0);
    expect(cache.getLastLotteryXpAt(CHANNEL_B, TWITCH_ID)).toBe(0);
  });

  it("still clears the verified set and the hero cache, and nothing else", () => {
    const cache = new UserCache();

    cache.markVerified(CHANNEL_A, TWITCH_ID);
    cache.setHero(CHANNEL_A, TWITCH_ID, "hero_a", NOW);
    cache.setCoins(CHANNEL_A, TWITCH_ID, 100, NOW);
    cache.setLastXpAt(CHANNEL_A, TWITCH_ID, NOW);
    cache.setLastLotteryXpAt(CHANNEL_A, TWITCH_ID, NOW);

    cache.clearAll();

    expect(cache.isVerified(CHANNEL_A, TWITCH_ID)).toBe(false);
    expect(cache.getHero(CHANNEL_A, TWITCH_ID, NOW)).toBeUndefined();
    expect(cache.getCoins(CHANNEL_A, TWITCH_ID, NOW)).toBe(100);
    expect(cache.getLastXpAt(CHANNEL_A, TWITCH_ID)).toBe(NOW);
    expect(cache.getLastLotteryXpAt(CHANNEL_A, TWITCH_ID)).toBe(NOW);
  });
});