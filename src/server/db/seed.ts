import "dotenv/config";

import { parseSeedEnv } from "../env-schema";

const env = parseSeedEnv(process.env);

if (!env.SEED_ENABLED) {
  console.info("Seed disabled; nothing to do.");
} else {
  console.info("Seed schema will be introduced in implementation stage 2.");
}
