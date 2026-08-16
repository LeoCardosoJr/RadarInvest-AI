import "dotenv/config";

import { defineConfig } from "drizzle-kit";

import { parseMigrationEnv } from "./src/server/env-schema";

const env = parseMigrationEnv(process.env);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
