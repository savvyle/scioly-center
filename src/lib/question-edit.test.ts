import { describe, expect, it } from "vitest";
import { canEditQuestion, questionEditSchema } from "./question-edit";

describe("question editing", () => {
  it("allows coaches", () => expect(canEditQuestion("coach")).toBe(true));
  it("allows captains", () => expect(canEditQuestion("captain")).toBe(true));
  it("denies students", () => expect(canEditQuestion("student")).toBe(false));
  it("rejects an answer key outside the choices", () => {
    expect(questionEditSchema.safeParse({ questionId: "f143d671-9800-4505-9030-804c0dcbeeef", stem: "Question", question_type: "single", choices: ["One", "Two"], correct_indices: [2], accepted_answers: [], grading_rubric: "" }).success).toBe(false);
  });
});