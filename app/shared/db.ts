import postgres from "postgres";
import { serverEnv } from "./env.server";

let sql: ReturnType<typeof postgres> | null = null;

export const getDb = () => {
  if (sql) return sql;
  sql = postgres(serverEnv.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  return sql;
};
