type EventTotals = { event: string; answered: number; correct: number };

export function selectedEventProgress(picked: string[], totals: EventTotals[]) {
  return picked.map((event) => {
    const rows = totals.filter((row) => row.event === event);
    const answered = rows.reduce((sum, row) => sum + row.answered, 0);
    const correct = rows.reduce((sum, row) => sum + row.correct, 0);
    return { event, answered, correct, accuracy: answered ? correct / answered : null };
  }).sort((a, b) => (a.accuracy ?? -1) - (b.accuracy ?? -1) || a.event.localeCompare(b.event));
}