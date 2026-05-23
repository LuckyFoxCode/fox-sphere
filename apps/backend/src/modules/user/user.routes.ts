import { Router } from "express";
import { createUserController, getUsersController } from "./user.controller.js";
import { validateCreateUser } from "./user.schema.js";

export const userRouter = Router();

userRouter.post("/", validateCreateUser, createUserController);
userRouter.get("/", getUsersController);
