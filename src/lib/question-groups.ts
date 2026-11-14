/** Only explicit source numbering establishes a group; similar topics never do. */
export function questionPart(stem: string) {
  const match = stem.match(/^(?:original\s+question\s+|question\s+)?(\d+)\s*[,.:–-]?\s*(?:part\s*(\d+)|[-–](\d+)|\(([a-z])\))\s*(?:\([^)]*\))?\s*[:.)-]?\s*/i);
  if (!match) return null;
  return { number: Number(match[1]), part: match[2] || match[3] || match[4], text: stem.slice(match[0].length) };
}

type ParsedQuestion = {
  number: number; stem: string; original_format: string; choices: string[]; correct_index: number;
  correct_indices: number[]; accepted_answers: string[]; grading_rubric: string; points: number;
  confidence: number; needs_image: boolean; explanation: string;
};

export function combineQuestionParts<T extends ParsedQuestion>(questions: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const [i, q] of questions.entries()) {
    const explicit = questionPart(q.stem);
    const key = explicit ? `number:${explicit.number}` : q.number > 0 ? `number:${q.number}` : `row:${i}`;
    const group = groups.get(key) ?? [];
    group.push(q);
    groups.set(key, group);
  }
  return [...groups.values()].map((parts) => {
    const first = parts[0];
    if (!first) throw new Error("Empty question group");
    if (parts.length === 1) return first;
    const label = (q: T, i: number) => questionPart(q.stem)?.part || String(i + 1);
    const answer = (q: T) => q.accepted_answers?.[0] || (q.original_format === "multiple" ? q.correct_indices.map((i) => q.choices[i]).join("; ") : q.choices[q.correct_index]) || "Answer key missing";
    return {
      ...first,
      stem: `Question ${questionPart(first.stem)?.number ?? first.number}\n\n${parts.map((q, i) => `(${label(q, i)}) ${questionPart(q.stem)?.text ?? q.stem}${q.choices.length ? "\n" + q.choices.map((c, j) => `${String.fromCharCode(65 + j)}. ${c}`).join("\n") : ""}`).join("\n\n")}`,
      original_format: "free_response", choices: [], correct_index: 0, correct_indices: [],
      accepted_answers: [parts.map((q, i) => `(${label(q, i)}) ${answer(q)}`).join("\n")],
      grading_rubric: parts.map((q, i) => `(${label(q, i)}) ${q.points || 1} points: ${q.grading_rubric || answer(q)}`).join("\n"),
      points: parts.reduce((sum, q) => sum + (q.points || 1), 0),
      confidence: Math.min(...parts.map((q) => q.confidence)), needs_image: parts.some((q) => q.needs_image),
      explanation: parts.map((q, i) => `(${label(q, i)}) ${q.explanation}`).join("\n"),
    };
  });
}