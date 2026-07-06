import * as z from "zod";

export const CreateUserSchema = z.object({
  twitchId: z.string().min(3, "Twitch ID must be at least 3 characters long"),
  username: z.string().min(2, "Username must be at least 2 characters long"),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
