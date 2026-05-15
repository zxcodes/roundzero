import { createMiddleware } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { getUserById } from "@/features/auth/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { type SessionData, sessionConfig } from "@/shared/session";

/**
 * Requires an authenticated user. Passes `userId` and `user` into context.
 * Rejects soft-deleted users even if they hold a valid session.
 */
export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await useSession<SessionData>(sessionConfig);

  if (!session.data.userId) {
    throw new Error("Not authenticated");
  }

  const db = getDb();
  const user = await getUserById(db, { id: session.data.userId });

  if (!user) {
    throw new Error("Not authenticated");
  }

  return next({ context: { userId: user.id, user } });
});

/**
 * Requires an authenticated user who owns a company.
 * Passes `userId` and `company` into context.
 */
export const companyMiddleware = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const db = getDb();
    const company = await getCompanyByOwnerId(db, { ownerId: context.userId });

    if (!company) {
      throw new Error("No company found");
    }

    return next({ context: { company } });
  });
