import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Request, Response } from "express";
import * as userService from "../services/user.service.js";

export const createUserController = async (req: Request, res: Response) => {
  try {
    const { twitchId, username } = req.body;

    if (!twitchId || !username) {
      return res.status(400).json({
        message: "Не удалось создать пользователя",
        error: "Поля twitchId и username обязательны для заполнения.",
      });
    }

    const newUser = await userService.createUser({ twitchId, username });

    return res.status(201).json(newUser);
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({
          message: "Пользователь с таким Twitch ID уже зарегистрирован",
          error: "Unique constraint failed on twitchId",
        });
      }
    }
    return res.status(500).json({
      message: "Внутренняя ошибка сервера. Мы уже чиним!",
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
      message: "Не удалось загрузить список пользователей",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
