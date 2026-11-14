import { expect, it } from "vitest";
import { schoolYear } from "./school-year";
it("displays the 2027 competition season as school year 2026-27", () => {
  expect(schoolYear(2027)).toBe("2026-27");
  expect(schoolYear(null)).toBe("");
});