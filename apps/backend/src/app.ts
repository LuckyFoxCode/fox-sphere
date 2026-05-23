import cors from "cors";
import express from "express";
import { userRouter } from "./modules/user/user.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/users", userRouter);

export { app };
