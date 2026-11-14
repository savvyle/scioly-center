import { expect, it } from "vitest";
import { safeRepair } from "./report-repair";
const result = { fixable: true, confidence: 0.98, reason: "Typo confirmed in source", stem: "What is a cell?", question_type: "single" as const, choices: ["A", "B"], correct_indices: [0], accepted_answers: [], grading_rubric: "", feedback_bullets: ["A is correct."] };
const id = "830c7140-e4e7-43ad-bcd5-a81742e9186d";
it("sends uncertain or source-less repairs to the coach", () => {
  expect(safeRepair({ ...result, confidence: 0.8 }, id, true)).toBeNull();
  expect(safeRepair(result, id, false)).toBeNull();
});
it("accepts only validated source-backed repairs", () => {
  expect(safeRepair(result, id, true)?.stem).toBe("What is a cell?");
  expect(safeRepair({ ...result, correct_indices: [9] }, id, true)).toBeNull();
});