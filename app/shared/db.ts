import { env } from "cloudflare:workers";
import postgres from "postgres";

export const getDb = () => {
  return postgres(env.HYPERDRIVE.connectionString, {
    fetch_types: false,
    idle_timeout: 5,
    max: 5,
    max_lifetime: 60,
    prepare: true,
  });
};
