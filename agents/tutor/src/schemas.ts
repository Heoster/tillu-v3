import { z } from "zod";

export const TutorModeSchema = z.enum(["hint", "explanation", "similar_question", "answer"]);

export const SimilarQuestionSchema = z.object({
  question: z.string().min(1),
  hint:     z.string().min(1),
});

export const TutorOutputSchema = z.object({
  mode:                TutorModeSchema,
  content:             z.string().min(1),
  hint:                z.string().nullable().optional(),
  follow_up_question:  z.string().nullable().optional(),
  correct_method:      z.string().nullable().optional(),
  concept_to_review:   z.string().nullable().optional(),
  similar_question:    SimilarQuestionSchema.nullable().optional(),
});

export const TutorRequestPayloadSchema = z.object({
  action:         z.enum(["hint", "explain", "reveal", "similar"]),
  question:       z.string().min(1).max(1000),
  subject:        z.string().min(1),
  concept:        z.string().optional().default(""),
  student_answer: z.string().optional(), // for "explain" action
  student_id:     z.string().uuid(),
});

export type TutorOutput = z.infer<typeof TutorOutputSchema>;
export type TutorRequestPayload = z.infer<typeof TutorRequestPayloadSchema>;
