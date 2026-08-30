import { prisma } from "@fox-sphere/backend-shared";
import type { ChannelResponse } from "@fox-sphere/shared-schemas";

export const getChannelById = async (
  id: string,
): Promise<ChannelResponse | null> => {
  const channel = await prisma.channel.findUnique({
    where: { id },
    select: {
      id: true,
      twitchId: true,
      login: true,
      displayName: true,
      status: true,
      botIsMod: true,
    },
  });

  return channel ?? null;
};
