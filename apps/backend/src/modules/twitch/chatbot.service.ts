import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { config } from "../../shared/config/index.js";

export class ChatbotService {
  private chatClient!: ChatClient;

  constructor(private authProvider: RefreshingAuthProvider) {}

  public async start(): Promise<void> {
    try {
      this.chatClient = new ChatClient({
        authProvider: this.authProvider,
        channels: [config.twitch.channelName],
      });

      this.registerCommands();

      this.chatClient.connect();
      console.log("🚀 Чат-бот успешно подключился к Twitch!");
    } catch (error) {
      console.error("❌ Ошибка подключения бота:", error);
      throw error;
    }
  }

  private registerCommands(): void {
    this.chatClient.onMessage((channel, user, text, _msg) => {
      console.log(`[${channel}] ${user}: ${text}`);

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
