import { COOLDOWNS } from "./user.constants";

/**
 * Every entry is keyed by the channel the viewer was seen in as well as by their Twitch id.
 *
 * `channelId` is a required parameter of every method and the key is built in one private
 * place, so a caller cannot reach a map without passing a channel first. A bare `twitchId` key
 * is the same defect the cutover exists to remove, one level down: the process happens to serve
 * one channel, so it would read correctly until the second one arrives and then hand one
 * stream another stream's coins. See `resolveChannelContext` for why the id is stable.
 */
const cacheKey = (channelId: string, twitchId: string): string => `${channelId}:${twitchId}`;

export class UserCache {
  private verifiedUsers = new Set<string>();
  private xpCooldowns = new Map<string, number>();
  private lotteryCooldowns = new Map<string, number>();
  private coins = new Map<string, { coins: number; createdAt: number }>();
  private heroes = new Map<string, { heroId: string; createdAt: number }>();

  public isVerified(channelId: string, twitchId: string): boolean {
    return this.verifiedUsers.has(cacheKey(channelId, twitchId));
  }

  public markVerified(channelId: string, twitchId: string): void {
    this.verifiedUsers.add(cacheKey(channelId, twitchId));
  }

  public getLastXpAt(channelId: string, twitchId: string): number {
    return this.xpCooldowns.get(cacheKey(channelId, twitchId)) || 0;
  }

  public setLastXpAt(channelId: string, twitchId: string, lastXpAt: number): void {
    this.xpCooldowns.set(cacheKey(channelId, twitchId), lastXpAt);
  }

  public getLastLotteryXpAt(channelId: string, twitchId: string): number {
    return this.lotteryCooldowns.get(cacheKey(channelId, twitchId)) || 0;
  }

  public setLastLotteryXpAt(
    channelId: string,
    twitchId: string,
    lastLotteryXpAt: number,
  ): void {
    this.lotteryCooldowns.set(cacheKey(channelId, twitchId), lastLotteryXpAt);
  }

  public getCoins(
    channelId: string,
    twitchId: string,
    now: number,
  ): number | undefined {
    const cached = this.coins.get(cacheKey(channelId, twitchId));

    if (cached && now - cached.createdAt < COOLDOWNS.COINS_CACHE_TTL) {
      return cached.coins;
    }

    return undefined;
  }

  public setCoins(
    channelId: string,
    twitchId: string,
    coins: number,
    now: number,
  ): void {
    this.coins.set(cacheKey(channelId, twitchId), { coins, createdAt: now });
  }

  public invalidateCoins(channelId: string, twitchId: string): void {
    this.coins.delete(cacheKey(channelId, twitchId));
  }

  public getHero(
    channelId: string,
    twitchId: string,
    now: number,
  ): string | undefined {
    const cached = this.heroes.get(cacheKey(channelId, twitchId));

    if (cached && now - cached.createdAt < COOLDOWNS.HERO_CACHE_TTL) {
      return cached.heroId;
    }

    return undefined;
  }

  public setHero(
    channelId: string,
    twitchId: string,
    heroId: string,
    now: number,
  ): void {
    this.heroes.set(cacheKey(channelId, twitchId), { heroId, createdAt: now });
  }

  /**
   * Drops the cached hero so the next message re-reads the row.
   *
   * The TTL alone is not enough once a hero can be bought: a purchase has to be visible on
   * the next message, not 30 seconds later.
   */
  public invalidateHero(channelId: string, twitchId: string): void {
    this.heroes.delete(cacheKey(channelId, twitchId));
  }

  /**
   * Clears the verified-user set and the hero cache — and nothing else.
   *
   * The coins cache and both cooldown maps survive a clear on purpose. Coins expire by
   * themselves on `COOLDOWNS.COINS_CACHE_TTL`, and dropping a cooldown entry would hand that
   * viewer a free message-xp award, so neither belongs here. Do not "tidy" this by clearing
   * all five.
   */
  public clearAll(): void {
    this.verifiedUsers.clear();
    this.heroes.clear();
  }
}