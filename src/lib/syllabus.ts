import b from "./syllabus-b.json";

export type Syllabus = Record<string, { type: string; topics: { name: string; subtopics: string[] }[] }>;
/** Concepts per event, extracted from the 2027 rules manuals. Division C pending its manual. */
export const SYLLABUS: Record<"B" | "C", Syllabus> = { B: b as Syllabus, C: {} };

const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
export function syllabusFor(event: string, division: string | null) {
  const pools = division === "C" ? [SYLLABUS.C, SYLLABUS.B] : [SYLLABUS.B, SYLLABUS.C];
  for (const p of pools) {
    const k = Object.keys(p).find((x) => norm(x) === norm(event));
    if (k) return p[k]!;
  }
  return null;
}
export function syllabusPrompt(event: string, division: string | null) {
  const s = syllabusFor(event, division);
  if (!s) return "";
  return `\nOfficial 2027 syllabus for this event. Set topic to EXACTLY one of these topic names and subtopic to one of its subtopics (closest match):\n${s.topics.map((t) => `- ${t.name}: ${t.subtopics.join("; ")}`).join("\n")}\n`;
}
