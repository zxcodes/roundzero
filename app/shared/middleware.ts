import { createMiddleware } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { getUserById } from "@/features/auth/queries/queries_sql";
import { getActiveMembershipByUserId } from "@/features/companies/queries/membership-queries_sql";
import { getCompanyById } from "@/features/companies/queries/queries_sql";
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
 * Requires an authenticated user with an active company membership.
 * Passes `company` and `membership` into context. Membership is the
 * canonical access-control primitive (owner | admin | member); the owner
 * is just the member whose role is `owner`.
 */
export const companyMiddleware = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const db = getDb();
    const membership = await getActiveMembershipByUserId(db, { userId: context.userId });

    if (!membership) {
      throw new Error("No company found");
    }

    const company = await getCompanyById(db, { id: membership.companyId });

    if (!company) {
      throw new Error("No company found");
    }

    return next({ context: { company, membership } });
  });
