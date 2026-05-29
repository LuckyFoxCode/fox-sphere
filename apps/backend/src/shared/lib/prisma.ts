import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { config } from "../config/index.js";

const connectionString = config.databaseUrl;

const pool = new pg.Pool({ connectionString });

const adapter = new PrismaPg(pool);

const logLevels: ("query" | "error" | "warn" | "info")[] = ["error", "warn"];

if (process.env.DEBUG === "true") {
  logLevels.push("query", "info");
}

export const prisma = new PrismaClient({
  adapter,
  log: logLevels,
});
