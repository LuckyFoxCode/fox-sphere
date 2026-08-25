import { Router } from "express";
import { GetChannelParamsSchema } from "@fox-sphere/shared-schemas";
import { validate } from "../../shared/middleware";
import { getChannelById } from "./channel.service";
import { NotFoundError } from "../../shared/errors/app-error";

const router = Router();

router.get(
  "/channels/:id",
  validate(GetChannelParamsSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const channel = await getChannelById(id);
    if (!channel) throw new NotFoundError("Channel not found");
    res.json(channel);
  },
);

export { router as channelRouter };
