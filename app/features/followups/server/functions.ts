import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { updateApplicationStatus } from "@/features/applications/queries/queries_sql";
import { getDb } from "@/shared/db";
import { serverEnv } from "@/shared/env.server";
import { authMiddleware } from "@/shared/middleware";
import {
  getApplicationFollowupForCandidate,
  submitApplicationFollowupAnswers,
} from "../queries/queries_sql";
import { followupAnswersSchema, parseFollowupQuestions } from "../types";

const applicationIdSchema = z.object({
  applicationId: z.string().uuid(),
});

const submitFollowupSchema = z.object({
  applicationId: z.string().uuid(),
  answers: followupAnswersSchema,
});

export const getMyFollowup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view follow-up questionnaires");
    }

    const followup = await getApplicationFollowupForCandidate(db, {
      applicationId: data.applicationId,
      candidateId: context.userId,
    });

    if (!followup) {
      return null;
    }

    return {
      ...followup,
      questions: parseFollowupQuestions(followup.questions),
      answers: followupAnswersSchema.parse(followup.answers ?? []),
    };
  });

export const submitMyFollowupAnswers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(submitFollowupSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can submit follow-up questionnaires");
    }

    const followup = await getApplicationFollowupForCandidate(db, {
      applicationId: data.applicationId,
      candidateId: context.userId,
    });

    if (!followup) {
      return null;
    }

    if (followup.status !== "pending") {
      return followup;
    }

    if (followup.applicationStatus !== "followups_requested") {
      throw new Error("This follow-up questionnaire is no longer accepting responses");
    }

    const questions = parseFollowupQuestions(followup.questions);
    if (questions.length === 0) {
      throw new Error("This follow-up questionnaire is not available right now");
    }

    const answerMap = new Map(
      data.answers.map((answer) => [answer.questionId, answer.value.trim()]),
    );

    for (const question of questions) {
      if (!question.required) {
        continue;
      }

      const value = answerMap.get(question.id);
      if (!value) {
        throw new Error("Please answer all required follow-up questions");
      }
    }

    const saved = await submitApplicationFollowupAnswers(db, {
      applicationId: data.applicationId,
      answers: data.answers,
    });

    if (!saved) {
      throw new Error("Failed to submit follow-up answers");
    }

    const statusUpdated = await updateApplicationStatus(db, {
      id: data.applicationId,
      status: "pre_screening",
    });

    if (!statusUpdated) {
      throw new Error("Failed to update application status");
    }

    try {
      await fetch(`${serverEnv.EDGE_WORKER_URL}/pre-evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serverEnv.EDGE_WORKER_SECRET}`,
        },
        body: JSON.stringify({ applicationId: data.applicationId }),
      });
    } catch (error) {
      console.error(
        `[submitMyFollowupAnswers] Failed to trigger pre-evaluation for ${data.applicationId}`,
        error,
      );
    }

    return saved;
  });
