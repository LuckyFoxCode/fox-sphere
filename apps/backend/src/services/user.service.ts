import { prisma } from "../lib/prisma.js";

interface CreateUserData {
  twitchId: string;
  username: string;
}

export const createUser = async (data: CreateUserData) => {
  return await prisma.user.create({ data });
};

export const getAllUsers = async () => await prisma.user.findMany();
