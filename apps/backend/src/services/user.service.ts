import { CreateUserDto } from "@fox-sphere/shared-schemas";
import { prisma } from "../lib/prisma.js";

export const createUser = async (data: CreateUserDto) => {
  return await prisma.user.create({ data });
};

export const getAllUsers = async () => await prisma.user.findMany();
