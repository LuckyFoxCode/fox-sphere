import { z } from "zod";
import "../zod-extensions.js";

export const ChannelStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "PAUSED",
  "REVOKED",
]);

export const ChannelResponseSchema = z
  .object({
    id: z.string().openapi({ example: "clx1abc123def" }),
    twitchId: z.string().openapi({ example: "12345678" }),
    login: z.string().openapi({ example: "luckyfoxcode" }),
    displayName: z.string().openapi({ example: "LuckyFoxCode" }),
    status: ChannelStatusSchema,
    botIsMod: z.boolean(),
  })
  .openapi("Channel");

export type ChannelResponse = z.infer<typeof ChannelResponseSchema>;

export const GetChannelParamsSchema = z
  .object({
    id: z
      .string()
      .openapi({ example: "clx1abc123def", param: { name: "id", in: "path" } }),
  })
  .openapi("GetChannelParams");

export type GetChannelParams = z.infer<typeof GetChannelParamsSchema>;

export const ChannelListSchema = z
  .array(ChannelResponseSchema)
  .openapi("ChannelList");

export type ChannelList = z.infer<typeof ChannelListSchema>;
