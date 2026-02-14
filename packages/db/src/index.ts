import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

export type Database = NodePgDatabase<typeof schema>;

export function createDb(connectionString: string): Database {
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema });
}

export * from "./schema.js";
export { eq, desc, and, or, sql } from "drizzle-orm";
