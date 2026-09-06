import { ConflictError, prisma } from "@fox-sphere/backend-shared";
import type {
  ChannelList,
  ChannelResponse,
  CreateChannelDto,
} from "@fox-sphere/shared-schemas";

const channelSelect = {
  id: true,
  twitchId: true,
  login: true,
  displayName: true,
  status: true,
  botIsMod: true,
} as const;

export const getChannelById = async (
  id: string,
): Promise<ChannelResponse | null> => {
  const channel = await prisma.channel.findUnique({
    where: { id },
    select: channelSelect,
  });

  return channel ?? null;
};

export const createChannel = async (
  data: CreateChannelDto,
): Promise<ChannelResponse> => {
  try {
    return await prisma.channel.create({
      data: {
        twitchId: data.twitchId,
        login: data.login,
        displayName: data.displayName,
        status: data.status,
        botIsMod: data.botIsMod,
      },
      select: channelSelect,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      throw new ConflictError("Channel with this twitchId already exists");
    }
    throw error;
  }
};

export const listChannels = async (): Promise<ChannelList> => {
  return prisma.channel.findMany({
    select: channelSelect,
    orderBy: { createdAt: "asc" },
  });
};
