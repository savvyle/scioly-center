/** Weekly window: weeks run Saturday 00:00 to Friday 11:59pm Pacific. */
export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
export function meetsGoal(answered: number, correct: number, goal: { questions: number; accuracy: number }) {
  if (answered < goal.questions) return false;
  return correct / answered >= goal.accuracy;
}
export function fmtWeek(start: string, end: string) {
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "America/Los_Angeles" };
  const e = new Date(new Date(end).getTime() - 60_000);
  return `${new Date(start).toLocaleDateString("en-US", o)} – ${e.toLocaleDateString("en-US", o)}`;
}
