import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Request, Response } from "express";
import * as userService from "./user.service.js";

export const createUserController = async (req: Request, res: Response) => {
  try {
    const newUser = await userService.createUser(req.body);

    return res.status(201).json(newUser);
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "A user with this Twitch ID is already registered",
        error: "Unique constraint failed on twitchId",
      });
    }
    return res.status(500).json({
      message: "Internal server error. We are already fixing it!",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getUsersController = async (_req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    return res.json(users);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch users list",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
