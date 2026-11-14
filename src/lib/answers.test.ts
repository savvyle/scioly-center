import { describe, expect, it } from "vitest";
import { cleanStem, earnedPoints, sameSelection } from "./answers";
describe("answer grading", () => {
  it("requires every correct selection and no extra selections", () => {
    expect(sameSelection([2, 0], [0, 2])).toBe(true);
    expect(sameSelection([0], [0, 2])).toBe(false);
    expect(sameSelection([0, 1, 2], [0, 2])).toBe(false);
  });
  it("clamps awarded points to the question's points", () => {
    expect(earnedPoints(4, 3)).toBe(3);
    expect(earnedPoints(-1, 3)).toBe(0);
    expect(earnedPoints(1.5, 3)).toBe(1.5);
  });
  it("removes original-question references without removing scientific content", () => {
    expect(cleanStem("Original question: What causes YORP?")).toBe("What causes YORP?");
  });
  it("preserves all labeled subparts together", () => {
    expect(cleanStem("Original question: Context\n(a) Name the cell.\n(b) Explain its function.")).toBe("Context\n(a) Name the cell.\n(b) Explain its function.");
  });
  it("removes source-number prefixes without removing subparts or scientific numbers", () => {
    for (const prefix of ["Question 7. ", "Question #7: ", "Q7. ", "7. ", "7) ", "Original question 7. "]) {
      expect(cleanStem(`${prefix}What is the name for the bifurcation of the trachea?`)).toBe("What is the name for the bifurcation of the trachea?");
    }
    expect(cleanStem("Question 98\n\n(a) Name the cell.\n(b) Explain its function.")).toBe("(a) Name the cell.\n(b) Explain its function.");
    expect(cleanStem("98 percent of cells respond.\n1. First condition\n2. Second condition")).toBe("98 percent of cells respond.\n1. First condition\n2. Second condition");
  });
});