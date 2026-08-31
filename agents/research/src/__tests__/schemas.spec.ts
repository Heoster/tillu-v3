import { describe, it, expect } from "vitest";
import { ResearchOutputSchema, ResearchRequestPayloadSchema, ResearchClaimSchema } from "../schemas.js";

// ── ResearchClaimSchema ───────────────────────────────────────────────────────

describe("ResearchClaimSchema", () => {
  it("accepts valid HIGH confidence claim", () => {
    expect(ResearchClaimSchema.safeParse({
      claim: "Ohm's Law states V = IR",
      explanation: "Voltage is the product of current and resistance",
      confidence: "HIGH",
      board_relevance: true,
      source_hint: "NCERT Physics Part 1, Chapter 3",
    }).success).toBe(true);
  });

  it("accepts UNVERIFIED claim with null source_hint", () => {
    expect(ResearchClaimSchema.safeParse({
      claim: "Some fact",
      explanation: "Some explanation",
      confidence: "UNVERIFIED",
      board_relevance: false,
      source_hint: null,
    }).success).toBe(true);
  });

  it("rejects invalid confidence level", () => {
    expect(ResearchClaimSchema.safeParse({
      claim: "Some fact",
      explanation: "Some explanation",
      confidence: "CERTAIN",  // not valid
      board_relevance: true,
    }).success).toBe(false);
  });

  it("rejects missing claim text", () => {
    expect(ResearchClaimSchema.safeParse({
      claim: "",
      explanation: "Some explanation",
      confidence: "HIGH",
      board_relevance: true,
    }).success).toBe(false);
  });
});

// ── ResearchOutputSchema ──────────────────────────────────────────────────────

describe("ResearchOutputSchema", () => {
  const validOutput = {
    summary: "Ohm's Law relates voltage, current and resistance.",
    claims: [
      { claim: "V = IR", explanation: "Voltage equals current times resistance", confidence: "HIGH", board_relevance: true },
    ],
    board_tip: "Remember the formula V = IR and its rearrangements",
    related_concepts: ["Current Electricity", "Resistance"],
    possible_exam_questions: ["State and explain Ohm's Law"],
  };

  it("parses a valid research output", () => {
    expect(ResearchOutputSchema.safeParse(validOutput).success).toBe(true);
  });

  it("rejects empty claims array", () => {
    expect(ResearchOutputSchema.safeParse({ ...validOutput, claims: [] }).success).toBe(false);
  });

  it("rejects empty summary", () => {
    expect(ResearchOutputSchema.safeParse({ ...validOutput, summary: "" }).success).toBe(false);
  });

  it("accepts output with no board_tip (null)", () => {
    expect(ResearchOutputSchema.safeParse({ ...validOutput, board_tip: null }).success).toBe(true);
  });

  it("defaults related_concepts to [] when not provided", () => {
    const { related_concepts: _, ...rest } = validOutput;
    const result = ResearchOutputSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.related_concepts).toEqual([]);
  });

  // Research invariant: UNVERIFIED claims are never silently promoted
  it("preserves UNVERIFIED confidence level — never upgrades it", () => {
    const withUnverified = {
      ...validOutput,
      claims: [{ claim: "Unconfirmed fact", explanation: "From AI", confidence: "UNVERIFIED", board_relevance: false }],
    };
    const result = ResearchOutputSchema.safeParse(withUnverified);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.claims[0]?.confidence).toBe("UNVERIFIED");
    }
  });
});

// ── ResearchRequestPayloadSchema ──────────────────────────────────────────────

describe("ResearchRequestPayloadSchema", () => {
  it("accepts valid payload", () => {
    expect(ResearchRequestPayloadSchema.safeParse({
      query: "What is Coulomb's Law?",
      subject: "Physics",
      student_id: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(true);
  });

  it("rejects query shorter than 3 chars", () => {
    expect(ResearchRequestPayloadSchema.safeParse({
      query: "V?",
      subject: "Physics",
      student_id: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(false);
  });

  it("rejects query longer than 500 chars", () => {
    expect(ResearchRequestPayloadSchema.safeParse({
      query: "A".repeat(501),
      subject: "Physics",
      student_id: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(false);
  });

  it("rejects non-UUID student_id", () => {
    expect(ResearchRequestPayloadSchema.safeParse({
      query: "What is Ohm's Law?",
      subject: "Physics",
      student_id: "not-uuid",
    }).success).toBe(false);
  });
});
