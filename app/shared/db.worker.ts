import { env } from "cloudflare:workers";
import postgres from "postgres";

export const getWorkerDb = () => {
  return postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 10,
  });
};
