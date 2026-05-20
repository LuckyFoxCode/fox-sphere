import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "../config/index.js";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = config.databaseUrl;

const pool = new pg.Pool({ connectionString });

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ["query", "error", "warn", "info"],
});
