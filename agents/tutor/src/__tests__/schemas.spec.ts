import { describe, it, expect } from "vitest";
import { TutorOutputSchema, TutorRequestPayloadSchema } from "../schemas.js";

describe("TutorRequestPayloadSchema", () => {
  it("accepts hint action", () => {
    expect(TutorRequestPayloadSchema.safeParse({
      action: "hint",
      question: "What is the lens formula?",
      subject: "Physics",
      student_id: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(true);
  });

  it("accepts explain action with student_answer", () => {
    expect(TutorRequestPayloadSchema.safeParse({
      action: "explain",
      question: "Derive lens formula",
      subject: "Physics",
      student_answer: "1/f = 1/v + 1/u (wrong sign)",
      student_id: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(true);
  });

  it("rejects invalid action", () => {
    expect(TutorRequestPayloadSchema.safeParse({
      action: "solve",
      question: "Some question",
      subject: "Maths",
      student_id: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(false);
  });

  it("rejects empty question", () => {
    expect(TutorRequestPayloadSchema.safeParse({
      action: "hint",
      question: "",
      subject: "Physics",
      student_id: "550e8400-e29b-41d4-a716-446655440000",
    }).success).toBe(false);
  });

  it("rejects non-UUID student_id", () => {
    expect(TutorRequestPayloadSchema.safeParse({
      action: "hint",
      question: "What is V = IR?",
      subject: "Physics",
      student_id: "not-a-uuid",
    }).success).toBe(false);
  });
});

describe("TutorOutputSchema", () => {
  it("accepts valid hint output", () => {
    expect(TutorOutputSchema.safeParse({
      mode: "hint",
      content: "Think about refraction at a curved surface.",
      hint: "Think about refraction at a curved surface.",
      follow_up_question: "What does the sign convention say about image distance?",
      correct_method: null,
      concept_to_review: "Lens Formula",
      similar_question: null,
    }).success).toBe(true);
  });

  it("accepts valid answer output with similar_question", () => {
    expect(TutorOutputSchema.safeParse({
      mode: "answer",
      content: "The lens formula is 1/v - 1/u = 1/f",
      correct_method: "Step 1: Apply sign convention. Step 2: 1/v - 1/u = 1/f",
      similar_question: {
        question: "A lens has focal length 20cm. Where is the image of an object at 30cm?",
        hint: "Apply 1/v - 1/u = 1/f with sign convention",
      },
    }).success).toBe(true);
  });

  it("rejects invalid mode", () => {
    expect(TutorOutputSchema.safeParse({
      mode: "chat",
      content: "Hello",
    }).success).toBe(false);
  });

  it("rejects empty content", () => {
    expect(TutorOutputSchema.safeParse({
      mode: "hint",
      content: "",
    }).success).toBe(false);
  });
});
