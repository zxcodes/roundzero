import postgres from "postgres";

export const getDb = (databaseUrl: string) => {
  return postgres(databaseUrl, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
};
