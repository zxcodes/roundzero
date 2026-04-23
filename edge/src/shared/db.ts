import { env } from "cloudflare:workers";
import postgres from "postgres";

export const getDb = () => {
  return postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
};
