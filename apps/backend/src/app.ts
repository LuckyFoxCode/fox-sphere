import cors from "cors";
import express from "express";
import { userRouter } from "./modules/user/user.routes";
import { errorHandler } from "./shared/middleware/error-handler";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/users", userRouter);

app.use(errorHandler);
export { app };
