import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import {
  EventSubChannelFollowEvent,
  EventSubChannelRedemptionAddEvent,
} from "@twurple/eventsub-base";
import { EventSubWsListener } from "@twurple/eventsub-ws";
import { Logger } from "../../shared/services/logger.service";

export interface EventSubConfig {
  userId: string;
  botId: string;
}

export class TwitchEventSubClient {
  private listener!: EventSubWsListener;
  private apiClient: ApiClient;

  constructor(
    private authProvider: RefreshingAuthProvider,
    private config: EventSubConfig,
  ) {
    this.apiClient = new ApiClient({ authProvider: this.authProvider });
  }

  public async start(): Promise<void> {
    try {
      this.listener = new EventSubWsListener({
        apiClient: this.apiClient,
      });

      await this.listener.start();
      Logger.info(
        "TwitchEventSubClient",
        "WebSocket listener successfully started.📡",
      );
    } catch (error) {
      Logger.error(
        "TwitchEventSubClient",
        "Failed to start EventSub WebSocket listener",
        error,
      );
    }
  }

  public async subscribeToFollows(
    callback: (e: EventSubChannelFollowEvent) => void,
  ) {
    return this.listener.onChannelFollow(
      this.config.userId,
      this.config.botId,
      (e) => {
        Logger.debug(
          "TwitchEventSubClient",
          `New follower detected: ${e.userDisplayName} (ID: ${e.userId}) 🎉`,
        );
        callback(e);
      },
    );
  }

  public async subscribeToRewards(
    callback: (data: {
      userId: string;
      userDisplayName: string;
      rewardTitle: string;
    }) => void,
  ) {
    return this.listener.onChannelRedemptionAdd(
      this.config.userId,
      (event: EventSubChannelRedemptionAddEvent) => {
        Logger.debug(
          "TwitchEventSubClient",
          `Reward redeemed: [${event.rewardTitle}] by ${event.userDisplayName} 🎉`,
        );

        callback({
          userId: event.userId,
          userDisplayName: event.userDisplayName,
          rewardTitle: event.rewardTitle,
        });
      },
    );
  }
}
