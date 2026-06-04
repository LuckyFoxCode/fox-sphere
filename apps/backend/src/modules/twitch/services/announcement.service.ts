import { ApiClient } from "@twurple/api";
import { Logger } from "../../../shared/services/logger.service";
import { TwitchConfig } from "../chatbot.service";
import { COOLDOWNS } from "../twitch.constants";

type AnnouncementColor = "blue" | "green" | "orange" | "purple" | "primary";

interface QueuedAnnouncement {
  message: string;
  color: AnnouncementColor;
}

export class AnnouncementService {
  private announcementQueue: QueuedAnnouncement[] = [];
  private isProcessingQueue = false;

  constructor(
    private apiClient: ApiClient,
    private twitchConfig: TwitchConfig,
  ) {}

  public async enqueue(
    message: string,
    color: AnnouncementColor = "blue",
  ): Promise<void> {
    this.announcementQueue.push({ message, color });
    Logger.debug(
      "AnnouncementService",
      `Announcement added to queue. Length: ${this.announcementQueue.length}`,
    );

    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;
    Logger.debug(
      "AnnouncementService",
      "Starting to process announcement queue.",
    );

    while (this.announcementQueue.length > 0) {
      const current = this.announcementQueue.shift();

      if (current) {
        try {
          await this.apiClient.asUser(this.twitchConfig.botId, async (ctx) => {
            await ctx.chat.sendAnnouncement(this.twitchConfig.userId, {
              message: current.message,
              color: current.color,
            });
          });

          Logger.debug(
            "AnnouncementService",
            `Successfully sent ${current.color} announcement: "${current.message.substring(0, 50)}..."`,
          );
        } catch (error) {
          Logger.error(
            "AnnouncementService",
            `Failed to send Twitch announcement from queue: "${current.message.substring(0, 50)}..."`,
            error,
          );

          await new Promise((resolve) =>
            setTimeout(resolve, COOLDOWNS.ANNOUNCEMENT_QUEUE),
          );
        }
      }
      this.isProcessingQueue = false;
      Logger.debug(
        "AnnouncementService",
        "Announcement queue is empty. Processor stopped.",
      );
    }
  }
}
