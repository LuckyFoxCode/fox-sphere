import { TwitchAnnouncementColor } from "@fox-sphere/types";
import { ApiClient } from "@twurple/api";
import { config, Logger } from "@fox-sphere/backend-shared";
import { COOLDOWNS } from "../twitch.constants";
import { TwitchConfig } from "../twitch.types";

interface QueuedAnnouncement {
  message: string;
  color: TwitchAnnouncementColor;
}

export class AnnouncementService {
  private announcementQueue: QueuedAnnouncement[] = [];
  private isProcessingQueue = false;

  constructor(
    private apiClient: ApiClient,
    private twitchConfig: TwitchConfig,
    private onAnnouncementSent?: (
      message: string,
      color: TwitchAnnouncementColor,
    ) => void,
  ) {}

  public async enqueue(
    message: string,
    color: TwitchAnnouncementColor = "blue",
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
          if (config.nodeEnv === "development") {
            Logger.debug(
              "AnnouncementService",
              `💤[DEV-MODE] Successfully sent announcement: "${current.message.substring(0, 50)}..."`,
            );
            await new Promise((resolve) => setTimeout(resolve, 200));
            this.onAnnouncementSent?.(current.message, current.color);
          } else {
            await this.apiClient.asUser(
              this.twitchConfig.botId,
              async (ctx) => {
                await ctx.chat.sendAnnouncement(this.twitchConfig.userId, {
                  message: current.message,
                  color: current.color,
                });
              },
            );

            Logger.debug(
              "AnnouncementService",
              `Successfully sent ${current.color} announcement: "${current.message.substring(0, 50)}..."`,
            );
            this.onAnnouncementSent?.(current.message, current.color);
          }
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
    }
    this.isProcessingQueue = false;
    Logger.debug(
      "AnnouncementService",
      "Announcement queue is empty. Processor stopped.",
    );
  }
}
