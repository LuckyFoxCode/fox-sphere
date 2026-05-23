import { CreateUserDto } from "@fox-sphere/shared-schemas";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { ConflictError } from "../../shared/errors/app-error.js";
import { prisma } from "../../shared/lib/prisma.js";

export const createUser = async (data: CreateUserDto) => {
  try {
    return await prisma.user.create({ data });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError(
        "A user with this Twitch ID is already registered",
      );
    }
    throw error;
  }
};

export const getAllUsers = async () => {
  return await prisma.user.findMany();
};
