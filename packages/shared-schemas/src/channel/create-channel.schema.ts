import { z } from "zod";
import "../zod-extensions.js";
import { ChannelStatusSchema } from "./get-channel.schema.js";

export const CreateChannelSchema = z
  .object({
    twitchId: z
      .string()
      .min(1, "twitchId is required")
      .openapi({ example: "99200545" }),
    login: z
      .string()
      .min(1, "login is required")
      .openapi({ example: "luckyfoxcode" }),
    displayName: z
      .string()
      .min(1, "displayName is required")
      .openapi({ example: "LuckyFoxCode" }),
    status: ChannelStatusSchema.optional(),
    botIsMod: z.boolean().optional(),
  })
  .openapi("CreateChannel");

export type CreateChannelDto = z.infer<typeof CreateChannelSchema>;
