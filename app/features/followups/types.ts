import { z } from "zod";

export const followupQuestionTypeSchema = z.enum(["single_choice", "short_text", "long_text"]);

export const followupQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  type: followupQuestionTypeSchema,
  required: z.boolean(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string().min(1)).optional(),
  maxLength: z.number().int().positive().optional(),
});

export type FollowupQuestion = z.infer<typeof followupQuestionSchema>;

export const followupAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.string(),
});

export type FollowupAnswer = z.infer<typeof followupAnswerSchema>;

export const followupAnswersSchema = z.array(followupAnswerSchema);

export const parseFollowupQuestions = (value: unknown): FollowupQuestion[] => {
  const parsed = z.array(followupQuestionSchema).safeParse(value);
  if (!parsed.success) {
    return [];
  }

  return parsed.data;
};

export const parseFollowupAnswers = (value: unknown): FollowupAnswer[] => {
  const parsed = followupAnswersSchema.safeParse(value);
  if (!parsed.success) {
    return [];
  }

  return parsed.data;
};
