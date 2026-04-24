import { env } from "cloudflare:workers";
import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export const getDb = () => {
  if (sql) return sql;
  sql = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  return sql;
};
