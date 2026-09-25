import { z } from "zod";
import "../zod-extensions";
import { ChannelStatusSchema } from "./get-channel.schema";

export const UpdateChannelSchema = z
  .object({
    status: ChannelStatusSchema.optional(),
    botIsMod: z.boolean().optional(),
  })
  .refine((data) => data.status !== undefined || data.botIsMod !== undefined, {
    error: "At least one of status or botIsMod is required",
  })
  .openapi("UpdateChannel");

export type UpdateChannelDto = z.infer<typeof UpdateChannelSchema>;
