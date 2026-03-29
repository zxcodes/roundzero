import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";
import { type SessionData, sessionConfig } from "@/shared/session";
import { createCompany as createCompanyQuery, getCompanyByOwnerId } from "./queries/queries_sql";

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100),
  description: z.string().max(500).optional(),
});

export const createCompany = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { name: string; description?: string }) => createCompanySchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const existing = await getCompanyByOwnerId(db, {
      ownerId: context.userId,
    });
    if (existing) {
      throw new Error("You already have a company");
    }

    const company = await createCompanyQuery(db, {
      ownerId: context.userId,
      name: data.name,
      description: data.description ?? null,
    });

    if (!company) {
      throw new Error("Failed to create company");
    }

    return { company };
  });

export const getMyCompany = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);

  if (!session.data.userId) {
    return null;
  }

  const db = getDb();
  const company = await getCompanyByOwnerId(db, {
    ownerId: session.data.userId,
  });
  return company;
});
