import { ApiClient, HelixChatBadgeSet } from "@twurple/api";
import { Logger } from "../../../shared/services";

export class TwitchBadgeService {
  private badgeCache = new Map<string, string>();

  constructor(
    private apiClient: ApiClient,
    private broadcasterId: string,
  ) {}

  public async init(): Promise<void> {
    try {
      const globalBadges = await this.apiClient.chat.getGlobalBadges();
      this.parseAndCacheBadges(globalBadges);

      const channelBadges = await this.apiClient.chat.getChannelBadges(
        this.broadcasterId,
      );
      this.parseAndCacheBadges(channelBadges);
    } catch (error) {
      Logger.error(
        "TwitchBadgeService",
        "Failed to cache Twitch badges",
        error,
      );
    }
  }

  private parseAndCacheBadges(badgesData: HelixChatBadgeSet[]): void {
    for (const badgeSet of badgesData) {
      for (const version of badgeSet.versions) {
        const cacheKey = `${badgeSet.id}:${version.id}`;
        this.badgeCache.set(cacheKey, version.getImageUrl(2));
      }
    }
  }

  public getBadgeUrls(badges: Record<string, string>): string[] {
    const urls: string[] = [];

    for (const [badgeId, version] of Object.entries(badges)) {
      const key = `${badgeId}:${version}`;
      const url = this.badgeCache.get(key);

      if (url) {
        urls.push(url);
      } else {
        urls.push(
          `https://static-cdn.jtvnw.net/badges/v1/${badgeId}/${version}/1`,
        );
      }
    }
    return urls;
  }
}
