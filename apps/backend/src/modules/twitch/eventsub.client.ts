import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { EventSubChannelFollowEvent } from "@twurple/eventsub-base";
import { EventSubWsListener } from "@twurple/eventsub-ws";

export class TwitchEventSubClient {
  private listener!: EventSubWsListener;
  private apiClient: ApiClient;

  constructor(private authProvider: RefreshingAuthProvider) {
    this.apiClient = new ApiClient({ authProvider: this.authProvider });
  }

  public async start(): Promise<void> {
    try {
      this.listener = new EventSubWsListener({
        apiClient: this.apiClient,
      });

      await this.listener.start();
      console.log("📡 [EventSub] Вебсокет слушатель успешно запущен.");
    } catch (error) {
      console.error("❌ [EventSub] Ошибка запуска:", error);
    }
  }

  public async subscribeToFollows(
    userId: string,
    botId: string,
    callback: (e: EventSubChannelFollowEvent) => void,
  ) {
    return this.listener.onChannelFollow(userId, botId, (e) => {
      console.log(`🎉 [EventSub] Новый фолловер: ${e.userDisplayName}`);
      callback(e);
    });
  }
}
