import { GetChannelParamsSchema } from "@fox-sphere/shared-schemas";
import { Router } from "express";
import { NotFoundError } from "@fox-sphere/backend-shared";
import { validate } from "../../shared/middleware";
import { getChannelById } from "./channel.service";

import "./channel.openapi";

const router: Router = Router();

router.get(
  "/channels/:id",
  validate(GetChannelParamsSchema, "params"),
  async (req, res) => {
    const id = req.params.id as string;
    const channel = await getChannelById(id);
    if (!channel) throw new NotFoundError("Channel not found");
    res.json(channel);
  },
);

export { router as channelRouter };
