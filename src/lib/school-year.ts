/** Stored competition years are the ending year of the school season. */
export function schoolYear(year: number | string | null | undefined) {
  if (!year) return "";
  const end = Number(year);
  if (!Number.isInteger(end)) return "";
  return `${end - 1}-${String(end).slice(-2)}`;
}