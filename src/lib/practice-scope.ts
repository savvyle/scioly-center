import { SYLLABUS } from "./syllabus";
export const DEFAULT_DIVISION = "B" as const;
const normalize = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
export function inPracticeScope(q: { event: string; division: string | null; topic: string | null; subtopic: string | null }) {
  if (q.division !== "C") return true;
  const event = Object.keys(SYLLABUS.B).find((name) => normalize(name) === normalize(q.event));
  const syllabus = event ? SYLLABUS.B[event] : undefined;
  const topic = syllabus?.topics.find((t) => normalize(t.name) === normalize(q.topic ?? ""));
  return !!topic && (!q.subtopic || topic.subtopics.some((s) => normalize(s) === normalize(q.subtopic ?? "")));
}