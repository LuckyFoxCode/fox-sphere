import "../zod-extensions";
import { z } from "zod";

// The only field the panel actually needs: the Twitch login behind the session cookie, so the
// header stops showing a hardcoded name. Deliberately not the user id - it has no use in the UI
// and would invite storing it client-side for no reason.
export const SessionMeSchema = z
  .object({
    login: z.string().openapi({ example: "luckyfoxcode" }),
  })
  .openapi("SessionMe");

export type SessionMe = z.infer<typeof SessionMeSchema>;
