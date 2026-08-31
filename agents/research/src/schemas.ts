import { z } from "zod";

/** Schema for a single research claim — every claim must have confidence */
export const ResearchClaimSchema = z.object({
  claim:           z.string().min(1),
  explanation:     z.string().min(1),
  confidence:      z.enum(["HIGH", "MEDIUM", "LOW", "UNVERIFIED"]),
  board_relevance: z.boolean(),
  source_hint:     z.string().nullable().optional(),
});

/** Full AI output schema — validated before any claim is stored */
export const ResearchOutputSchema = z.object({
  summary:               z.string().min(1),
  claims:                z.array(ResearchClaimSchema).min(1).max(10),
  board_tip:             z.string().nullable().optional(),
  related_concepts:      z.array(z.string()).optional().default([]),
  possible_exam_questions: z.array(z.string()).optional().default([]),
});

/** Request payload for the research agent's POST /run */
export const ResearchRequestPayloadSchema = z.object({
  query:      z.string().min(3).max(500),
  subject:    z.string().min(1),
  context:    z.string().optional(),
  student_id: z.string().uuid(),
  query_id:   z.string().uuid().optional(), // pre-created DB row id
});

export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;
export type ResearchClaim = z.infer<typeof ResearchClaimSchema>;
export type ResearchRequestPayload = z.infer<typeof ResearchRequestPayloadSchema>;
