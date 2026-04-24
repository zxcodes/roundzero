import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getDb } from "@/shared/db";
import { getPreEvaluationByApplicationId } from "../queries/queries_sql";

const getPreEvaluationSchema = z.object({
  applicationId: z.string().uuid(),
});

export const getPreEvaluationForApplication = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getPreEvaluationSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    return getPreEvaluationByApplicationId(db, { applicationId: data.applicationId });
  });
