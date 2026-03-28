import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export const getDb = () => {
  if (sql) return sql;
  if (!process.env.DATABASE_URL) {
    throw new Error("MISSING DATABASE_URL ENV");
  }
  sql = postgres(process.env.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  return sql;
};
