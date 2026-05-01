import postgres from "postgres";

export const getDb = () => {
  return postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 10,
  });
};
