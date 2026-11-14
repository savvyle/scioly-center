export type Answer = { indices: number[]; text: string };
export const emptyAnswer = (): Answer => ({ indices: [], text: "" });
export function sameSelection(selected: number[], correct: number[]) {
  const a = [...new Set(selected)].sort((x, y) => x - y);
  const b = [...new Set(correct)].sort((x, y) => x - y);
  return a.length === b.length && a.every((value, i) => value === b[i]);
}
export function cleanStem(stem: string) {
  return stem.replace(/\b(?:in the )?original question\s*(?:\([^)]*\))?\s*[:—-]?\s*/gi, "").trim();
}
export function earnedPoints(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, Number.isFinite(value) ? value : 0));
}