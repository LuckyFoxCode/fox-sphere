import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { config } from "../../shared/config/index.js";
import { UserService } from "./user.service.js";

export class ChatbotService {
  private chatClient!: ChatClient;

  constructor(
    private authProvider: RefreshingAuthProvider,
    private userService: UserService,
  ) {}

  public async start(): Promise<void> {
    try {
      this.chatClient = new ChatClient({
        authProvider: this.authProvider,
        channels: [config.twitch.channelName],
      });

      this.registerCommands();

      this.chatClient.connect();
      console.log("🚀 Чат-бот успешно подключился к Twitch!");

      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      setInterval(() => {
        this.userService.clearCache();
      }, TWENTY_FOUR_HOURS);
    } catch (error) {
      console.error("❌ Ошибка подключения бота:", error);
      throw error;
    }
  }

  private registerCommands(): void {
    this.chatClient.onMessage(async (channel, user, text, msg) => {
      console.log(`[${channel}] ${user}: ${text}`);

      try {
        const twitchId = msg.userInfo.userId;

        await this.userService.findOrCreateUser(twitchId, user);
        await this.userService.addXpForMessage(twitchId, 5);
      } catch (error) {
        console.error(" Ошибка авторегистрации пользователя из чата:", error);
      }

      if (text.startsWith("!ping")) {
        this.chatClient.say(channel, `@${user}, pong!`);
      }
    });
  }

  public async sendMessage(channel: string, message: string): Promise<void> {
    if (this.chatClient) {
      await this.chatClient.say(channel, message);
    }
  }
}
