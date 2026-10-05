import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const createDb = (url: string) => {
  const client = postgres(url, { max: 8 });
  return { client, db: drizzle(client, { schema }) };
};

export type Database = ReturnType<typeof createDb>["db"];
