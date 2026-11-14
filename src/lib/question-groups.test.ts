import { describe, expect, it } from "vitest";
import { combineQuestionParts, questionPart } from "./question-groups";

describe("grouped source questions", () => {
  const part = (n: number, stem: string, answer: string) => ({ number: n, stem, original_format: "free_response", choices: [], correct_index: 0, correct_indices: [], accepted_answers: [answer], grading_rubric: "", points: 1, confidence: 0.9, needs_image: false, explanation: "" });
  it("combines question 48 parts 1 and 2 with both answers and two points", () => {
    const grouped = combineQuestionParts([part(48, "Original question 48, part 1: Describe hairy tongue.", "Papillae fail to shed"), part(48, "Original question 48, part 2: List ONE cause.", "Poor oral hygiene")]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.stem).toBe("Question 48\n\n(1) Describe hairy tongue.\n\n(2) List ONE cause.");
    expect(grouped[0]?.accepted_answers).toEqual(["(1) Papillae fail to shed\n(2) Poor oral hygiene"]);
    expect(grouped[0]?.points).toBe(2);
  });
  it("combines repeated source numbers even when the AI omits part prefixes", () => {
    expect(combineQuestionParts([part(2, "GABA", "inhibitory"), part(2, "Glutamate", "excitatory")])).toHaveLength(1);
  });
  it("does not combine different question numbers just because topics match", () => {
    expect(combineQuestionParts([part(2, "GABA", "inhibitory"), part(3, "Glycine", "inhibitory")])).toHaveLength(2);
  });
  it("recognizes hyphenated subquestion numbers", () => {
    expect(questionPart("Question 2–3: GABA:")).toEqual({ number: 2, part: "3", text: "GABA:" });
  });
  it("recognizes all four Q98 item prefixes as the same parent", () => {
    const items = [1, 2, 3, 4].map((i) => part(98, `Original question 98, item ${i}: Condition ${i}`, `Answer ${i}`));
    expect(combineQuestionParts(items)).toHaveLength(1);
    expect(combineQuestionParts(items)[0]?.points).toBe(4);
  });
});