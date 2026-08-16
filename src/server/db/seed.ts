import "dotenv/config";

import { hash } from "bcryptjs";

import { parseSeedEnv } from "../env-schema";
import { createDatabase } from "./client";
import { seedDatabase } from "./seed-service";

async function main(): Promise<void> {
  const env = parseSeedEnv(process.env);
  const { client, db } = createDatabase(env.DATABASE_URL);

  try {
    await seedDatabase(env, {
      db,
      hashPassword: hash,
      logger: console,
    });
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error("Database seed failed.", error);
  process.exit(1);
});
