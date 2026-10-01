import {
  ConflictError,
  NotFoundError,
  prisma,
} from "@fox-sphere/backend-shared";
import type {
  ChannelList,
  ChannelResponse,
  CreateChannelDto,
  UpdateChannelDto,
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
  login: string,
): Promise<ChannelResponse | null> => {
  const channel = await prisma.channel.findUnique({
    where: { login },
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

export const patchChannel = async (
  login: string,
  data: UpdateChannelDto,
): Promise<ChannelResponse> => {
  try {
    return await prisma.channel.update({
      where: { login },
      data: { ...data },
      select: channelSelect,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      throw new NotFoundError("Channel not found");
    }
    throw error;
  }
};

export const deleteChannel = async (login: string): Promise<void> => {
  try {
    await prisma.channel.delete({
      where: { login },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      throw new NotFoundError("Channel not found");
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
