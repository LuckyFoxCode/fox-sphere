import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Fox API is running" });
});

app.listen(PORT, () => {
  console.log(`🦊 Backend ranges on http://localhost:${PORT}`);
});
