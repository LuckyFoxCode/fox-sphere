import { Router } from "express";
import { userRouter } from "./user.routes.js";

export const rootRouter = Router();

rootRouter.use("/users", userRouter);
