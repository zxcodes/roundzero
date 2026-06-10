import { env } from "cloudflare:workers";
import postgres from "postgres";

const MAX_NUMBER_OF_CONNECTIONS = 5;

export const getDb = () => {
  const connectionString = env.HYPERDRIVE.connectionString;
  return postgres(connectionString, { max: MAX_NUMBER_OF_CONNECTIONS });
};
