import { describe, expect, it } from "vitest";
import { masteryLevel, matchingItems, skipQuestion, sourceLabel, topicTree, matchesPracticeFilters, canStartPractice } from "./practice";

describe("practice rules", () => {
  it("requires at least one event before starting practice", () => {
    expect(canStartPractice([])).toBe(false);
    expect(canStartPractice(["Circuit Lab"])).toBe(true);
    expect(canStartPractice(["Circuit Lab", "Anatomy & Physiology"])).toBe(true);
    expect(matchesPracticeFilters({ event: "Circuit Lab", topic: "Electric circuits", subtopic: null }, [], [])).toBe(false);
  });
  it("leaves skipped questions eligible in a fresh session without recording an answer", () => {
    const seen: string[] = [];
    expect(skipQuestion(seen, "q98")).toEqual(["q98"]);
    expect(seen).toEqual([]);
  });
  it("shows three mastery stages from the existing four-box review schedule", () => {
    expect(masteryLevel(undefined)).toBe("Not started");
    expect(masteryLevel(0)).toBe("Still learning");
    expect(masteryLevel(3)).toBe("Still learning");
    expect(masteryLevel(4)).toBe("Mastered");
  });
  it("retains Q98's four matching responses and four-point source citation", () => {
    const stem = "Match each condition to its major immunologic mechanism.\n1. Graves' disease\n2. Myasthenia gravis\n3. Serum sickness\n4. Contact dermatitis";
    expect(matchingItems(stem, ["Delayed T-cell response", "Immune complexes", "Receptor stimulation", "Receptor blockade"])).toHaveLength(4);
    expect(sourceLabel({ tournament: "Highlands Invitational", division: "B", year: 2027 }, 98)).toBe("Highlands, B, 2026-27, Q98");
  });
  it("keeps subtopics under their own parent", () => {
    expect(topicTree([{ topic: "Immune disorders", subtopic: "Type 1–4 hypersensitivities" }, { topic: "Immune mechanisms", subtopic: "Innate immunity" }])).toEqual([{ name: "Immune disorders", subtopics: ["Type 1–4 hypersensitivities"] }, { name: "Immune mechanisms", subtopics: ["Innate immunity"] }]);
  });
  it("accepts multiple selected events and only their selected topics", () => {
    const question = { event: "Anatomy & Physiology", topic: "Immune disorders", subtopic: "Type 1–4 hypersensitivities" };
    expect(matchesPracticeFilters(question, ["Anatomy & Physiology", "Circuit Lab"], [["Anatomy & Physiology", "Immune disorders", null], ["Circuit Lab", "Electric circuits", null]])).toBe(true);
    expect(matchesPracticeFilters(question, ["Circuit Lab"], [])).toBe(false);
    expect(matchesPracticeFilters(question, ["Anatomy & Physiology"], [["Anatomy & Physiology", "Digestive anatomy", null]])).toBe(false);
  });
});