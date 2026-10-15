import "../zod-extensions";
import { z } from "zod";

// The panel's view of who is signed in: the handle Twitch assigns, and the name they chose for
// themselves. The header shows the display name because "luckyfoxcode" is nobody's idea of their
// own name. Deliberately not the user id - it has no use in the UI and would invite storing it
// client-side for no reason.
export const SessionMeSchema = z
  .object({
    login: z.string().openapi({ example: "luckyfoxcode" }),
    displayName: z.string().openapi({ example: "LuckyFoxCode" }),
  })
  .openapi("SessionMe");

export type SessionMe = z.infer<typeof SessionMeSchema>;
