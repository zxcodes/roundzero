import postgres from "postgres";
import { serverEnv } from "./env.server";

export const getDb = () => {
  return postgres(serverEnv.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
};
