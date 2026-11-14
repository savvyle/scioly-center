import { describe, it, expect } from "vitest";
import { conflictWith, groupOf } from "./conflict-blocks";

describe("conflict blocks", () => {
  it("Codebusters B is group 1", () => expect(groupOf("B", "Codebusters")).toBe(1));
  it("two group-1 events conflict", () => expect(conflictWith("B", ["Codebusters"], "Remote Sensing")).toBe("Codebusters"));
  it("different groups don't conflict", () => expect(conflictWith("B", ["Codebusters"], "Solar System")).toBeNull());
  it("Div C uses its own blocks", () => expect(groupOf("C", "Astronomy")).toBe(3));
  it("matches 'and' vs '&'", () => expect(groupOf("B", "Anatomy and Physiology")).toBe(6));
});
