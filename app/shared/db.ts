import { env } from "cloudflare:workers";
import postgres from "postgres";

export const getDb = () => {
  return postgres(env.HYPERDRIVE.connectionString, {
    max: 5,
    prepare: true,
  });
};
