import { expect, it } from "vitest";
import { DEFAULT_DIVISION, inPracticeScope } from "./practice-scope";
import { SYLLABUS } from "./syllabus";
it("defaults division settings to B", () => { expect(DEFAULT_DIVISION).toBe("B"); });
it("allows C questions on the B rule-book topics", () => {
  const entry = Object.entries(SYLLABUS.B)[0];
  const topic = entry?.[1].topics[0];
  if (!entry || !topic) throw new Error("Division B syllabus missing");
  expect(inPracticeScope({ event: entry[0], division: "C", topic: topic.name, subtopic: topic.subtopics[0] ?? null })).toBe(true);
});
it("excludes C questions outside B rule-book concepts", () => {
  expect(inPracticeScope({ event: "Anatomy & Physiology", division: "C", topic: "Not a B concept", subtopic: null })).toBe(false);
});
it("keeps B questions available", () => {
  expect(inPracticeScope({ event: "Anatomy & Physiology", division: "B", topic: null, subtopic: null })).toBe(true);
});