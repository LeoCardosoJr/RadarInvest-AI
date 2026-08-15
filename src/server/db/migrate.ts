import "dotenv/config";

import { existsSync } from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { parseDatabaseEnv } from "../env-schema";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const journalPath = path.join(migrationsFolder, "meta", "_journal.json");

async function main(): Promise<void> {
  const env = parseDatabaseEnv(process.env);

  if (!existsSync(journalPath)) {
    console.info("No migrations found; schema will be introduced in stage 2.");
    return;
  }

  const client = postgres(env.DATABASE_URL, { max: 1 });

  try {
    await migrate(drizzle(client), { migrationsFolder });
    console.info("Database migrations applied successfully.");
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error("Database migration failed.", error);
  process.exit(1);
});
