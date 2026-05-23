import cors from "cors";
import express from "express";
import { config } from "./config/index.js";
import { rootRouter } from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api", rootRouter);

app.listen(config.port, () => {
  console.log(`🦊 Backend ranges on http://localhost:${config.port}`);
});
