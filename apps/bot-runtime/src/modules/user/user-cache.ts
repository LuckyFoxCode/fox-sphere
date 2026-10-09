import { COOLDOWNS } from "./user.constants";

export class UserCache {
  private verifiedUsers = new Set<string>();
  private xpCooldowns = new Map<string, number>();
  private lotteryCooldowns = new Map<string, number>();
  private coins = new Map<string, { coins: number; createdAt: number }>();
  private heroes = new Map<string, { heroId: string; createdAt: number }>();

  public isVerified(twitchId: string): boolean {
    return this.verifiedUsers.has(twitchId);
  }

  public markVerified(twitchId: string): void {
    this.verifiedUsers.add(twitchId);
  }

  public getLastXpAt(twitchId: string): number {
    return this.xpCooldowns.get(twitchId) || 0;
  }

  public setLastXpAt(twitchId: string, lastXpAt: number): void {
    this.xpCooldowns.set(twitchId, lastXpAt);
  }

  public getLastLotteryXpAt(twitchId: string): number {
    return this.lotteryCooldowns.get(twitchId) || 0;
  }

  public setLastLotteryXpAt(twitchId: string, lastLotteryXpAt: number): void {
    this.lotteryCooldowns.set(twitchId, lastLotteryXpAt);
  }

  public getCoins(twitchId: string, now: number): number | undefined {
    const cached = this.coins.get(twitchId);

    if (cached && now - cached.createdAt < COOLDOWNS.COINS_CACHE_TTL) {
      return cached.coins;
    }

    return undefined;
  }

  public setCoins(twitchId: string, coins: number, now: number): void {
    this.coins.set(twitchId, { coins, createdAt: now });
  }

  public invalidateCoins(twitchId: string): void {
    this.coins.delete(twitchId);
  }

  public getHero(twitchId: string, now: number): string | undefined {
    const cached = this.heroes.get(twitchId);

    if (cached && now - cached.createdAt < COOLDOWNS.HERO_CACHE_TTL) {
      return cached.heroId;
    }

    return undefined;
  }

  public setHero(twitchId: string, heroId: string, now: number): void {
    this.heroes.set(twitchId, { heroId, createdAt: now });
  }

  /**
   * Drops the cached hero so the next message re-reads the row.
   *
   * The TTL alone is not enough once a hero can be bought: a purchase has to be visible on
   * the next message, not 30 seconds later.
   */
  public invalidateHero(twitchId: string): void {
    this.heroes.delete(twitchId);
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