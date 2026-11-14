import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

it("defines the requested review intervals and applies them on correct answers", () => {
  const migration = readFileSync("drizzle/migrations/0007_update_review_intervals.sql", "utf8");
  const pairs = [...migration.matchAll(/WHEN (\d+) THEN (\d+)/g)].map((match) => [Number(match[1]), Number(match[2])]);
  expect(pairs).toEqual([[1, 3], [2, 9], [3, 15]]);
  expect(migration).toContain("ELSE 25 END");
  expect(migration).toContain("public.review_interval_days(nb) * interval '1 day'");
});