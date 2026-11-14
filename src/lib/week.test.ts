import { describe, it, expect } from "vitest";
import { meetsGoal } from "./week";

const goal = { questions: 15, accuracy: 0.6 };
describe("weekly goal", () => {
  it("needs at least 15 questions", () => expect(meetsGoal(14, 14, goal)).toBe(false));
  it("needs 60% accuracy", () => expect(meetsGoal(20, 11, goal)).toBe(false));
  it("passes at exactly 15 questions and 60%", () => expect(meetsGoal(15, 9, goal)).toBe(true));
});
