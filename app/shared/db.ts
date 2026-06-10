import { env } from "cloudflare:workers";
import postgres from "postgres";

/**
 * Pool size per `getDb()` client (per Worker invocation). Allows concurrent
 * queries within a single handler (e.g. `Promise.all`) to run in parallel.
 *
 * Callers in Workflows MUST `await db.end()` after each step. Reusing a client
 * across steps (or across workflow resumes) leaks Hyperdrive origin connections
 * and eventually exhausts the pool — that, not the pool size, was the cause of
 * "Timed out while creating a new server connection". Request handlers are
 * cleaned up by the runtime automatically.
 */
const MAX_NUMBER_OF_CONNECTIONS = 5;

export const getDb = () => {
  const connectionString = env.HYPERDRIVE.connectionString;
  return postgres(connectionString, { max: MAX_NUMBER_OF_CONNECTIONS });
};
