import type { Router } from "express";
import { channelRouter } from "./channel";

/**
 * The single list of feature modules. `app.ts` mounts it and `dump-openapi.ts`
 * imports it for the registration side effect, so a module cannot be live in the
 * app while missing from the spec (or the reverse). Add new modules here only.
 */
export const modules: readonly { prefix: string; router: Router }[] = [
  { prefix: "/api", router: channelRouter },
];
