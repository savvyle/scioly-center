import { describe, expect, it } from "vitest";
import { selectedEventProgress } from "./event-progress";

describe("selected event progress", () => {
  it("includes picked events with no practice", () => {
    expect(selectedEventProgress(["Water Quality", "Solar System"], [])).toEqual([
      { event: "Solar System", answered: 0, correct: 0, accuracy: null },
      { event: "Water Quality", answered: 0, correct: 0, accuracy: null },
    ]);
  });
  it("totals done, right and accuracy only for picked events", () => {
    expect(selectedEventProgress(["Water Quality"], [
      { event: "Water Quality", answered: 3, correct: 2 },
      { event: "Water Quality", answered: 2, correct: 1 },
      { event: "Crime Busters", answered: 10, correct: 10 },
    ])).toEqual([{ event: "Water Quality", answered: 5, correct: 3, accuracy: 0.6 }]);
  });
  it("retains weakest-first ranking", () => {
    const rows = selectedEventProgress(["Strong", "Weak"], [
      { event: "Strong", answered: 10, correct: 9 },
      { event: "Weak", answered: 10, correct: 2 },
    ]);
    expect(rows.map((row) => row.event)).toEqual(["Weak", "Strong"]);
  });
});