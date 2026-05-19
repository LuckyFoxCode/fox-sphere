import cors from "cors";
import "dotenv/config";
import express from "express";
import userRoutes from "./routes/user.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", userRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🦊 Backend ranges on http://localhost:${PORT}`);
});
