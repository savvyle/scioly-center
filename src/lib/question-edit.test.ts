import { describe, expect, it } from "vitest";
import { canEditQuestion, questionEditSchema, questionFeedbackFields, questionRestoreFields } from "./question-edit";

describe("question editing", () => {
  it("restores removed questions to review without changing content or closed reports", () => {
    expect(questionRestoreFields()).toEqual({ status: "review" });
  });
  it("does not allow an empty question prompt to be saved", () => {
    expect(questionEditSchema.safeParse({ questionId: "f143d671-9800-4505-9030-804c0dcbeeef", stem: "  ", question_type: "single", choices: ["One", "Two"], correct_indices: [0], accepted_answers: [], grading_rubric: "" }).success).toBe(false);
  });
  it("allows coaches", () => expect(canEditQuestion("coach")).toBe(true));
  it("allows captains", () => expect(canEditQuestion("captain")).toBe(true));
  it("denies students", () => expect(canEditQuestion("student")).toBe(false));
  it("keeps edited feedback in the saved bullets and explanation", () => {
    const parsed = questionEditSchema.parse({ questionId: "f143d671-9800-4505-9030-804c0dcbeeef", stem: "Question", question_type: "single", choices: ["One", "Two"], correct_indices: [0], accepted_answers: [], grading_rubric: "", feedback_bullets: [" One is correct. ", "Two is incorrect."] });
    expect(questionFeedbackFields(parsed.feedback_bullets)).toEqual({ feedback_bullets: ["One is correct.", "Two is incorrect."], explanation: "One is correct.\nTwo is incorrect." });
  });
  it("clears stored feedback when the editor leaves it empty", () => {
    expect(questionFeedbackFields([])).toEqual({ feedback_bullets: [], explanation: null });
  });
  it("rejects an answer key outside the choices", () => {
    expect(questionEditSchema.safeParse({ questionId: "f143d671-9800-4505-9030-804c0dcbeeef", stem: "Question", question_type: "single", choices: ["One", "Two"], correct_indices: [2], accepted_answers: [], grading_rubric: "" }).success).toBe(false);
  });
});