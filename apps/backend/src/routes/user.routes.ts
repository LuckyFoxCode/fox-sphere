import { Router } from "express";
import {
  createUserController,
  getUsersController,
} from "../controllers/user.controller.js";

export const userRouter = Router();

userRouter.post("/", createUserController);
userRouter.get("/", getUsersController);
