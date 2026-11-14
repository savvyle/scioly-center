import { schoolYear } from "./school-year";

export function masteryLevel(box: number | null | undefined) {
  return box == null ? "Not started" : box >= 4 ? "Mastered" : "Still learning";
}

export function sourceLabel(source: { tournament: string | null; division: string | null; year: number | null }, number: number | null | undefined) {
  return [source.tournament?.replace(/\s+Invitational$/i, ""), source.division, schoolYear(source.year), number == null ? null : `Q${number}`].filter(Boolean).join(", ");
}

export function topicTree(rows: { topic: string | null; subtopic: string | null }[]) {
  const topics = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.topic) continue;
    const children = topics.get(row.topic) ?? new Set<string>();
    if (row.subtopic) children.add(row.subtopic);
    topics.set(row.topic, children);
  }
  return [...topics].sort(([a], [b]) => a.localeCompare(b)).map(([name, children]) => ({ name, subtopics: [...children].sort() }));
}

/** A skip excludes this question for the current pass only, never writes an attempt. */
export function skipQuestion(seen: string[], id: string) {
  return [...new Set([...seen, id])];
}

/** Matching banks remain part of the source prompt, with one response per numbered item. */
export function matchingItems(stem: string, choices: string[]) {
  if (!/\bmatch\b/i.test(stem) || choices.length < 2) return [];
  return [...stem.matchAll(/^\s*(\d+)[.)]\s+(.+)$/gm)].map((match) => ({ number: match[1], text: match[2] }));
}

export type TopicSelection = [event: string, topic: string, subtopic: string | null];
export function canStartPractice(events: string[]) {
  return events.length > 0;
}

export function matchesPracticeFilters(q: { event: string; topic: string | null; subtopic: string | null }, events: string[], topics: TopicSelection[]) {
  return canStartPractice(events) && events.includes(q.event) && (!topics.length || topics.some(([event, topic, subtopic]) => event === q.event && topic === q.topic && (!subtopic || subtopic === q.subtopic)));
}