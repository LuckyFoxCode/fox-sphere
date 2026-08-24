import dotenv from "dotenv";
import { resolve } from "path";
import { defineConfig, env } from "prisma/config";

// Load .env from the repo root (single .env for the monorepo)
dotenv.config({ path: resolve(import.meta.dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
