import { Request, Response } from "express";
import * as userService from "./user.service";

export const createUserController = async (req: Request, res: Response) => {
  const newUser = await userService.createUser(req.body);
  return res.status(201).json(newUser);
};

export const getUsersController = async (_req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  return res.json(users);
};
