import { Router } from "express";
import { createUserController, getUsersController } from "./user.controller";
import { validateCreateUser } from "./user.schema";

export const userRouter = Router();

userRouter.post("/", validateCreateUser, createUserController);
userRouter.get("/", getUsersController);
