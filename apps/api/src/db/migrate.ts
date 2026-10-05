import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { loadEnv } from "./env";

const run = async () => {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const dir = resolve(__dirname, "../../drizzle");
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const client = postgres(url, { max: 1 });
  for (const file of files) {
    await client.unsafe(readFileSync(resolve(dir, file), "utf8"));
  }
  await client.end();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
