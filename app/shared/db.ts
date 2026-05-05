import { env } from "cloudflare:workers";
import postgres from "postgres";

export const getDb = () => {
  const connectionString = env.HYPERDRIVE.connectionString;
  return postgres(connectionString);
};
