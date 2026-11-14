import { EVENTS, LEVELS } from "./events";
import { DEFAULT_DIVISION } from "./practice-scope";

export function normalizeTestMetadata(value: unknown) {
  const m = value as { event?: unknown; division?: unknown; year?: unknown; tournament?: unknown; level?: unknown } | null;
  const event = EVENTS.find((e) => e === m?.event);
  if (!event) throw new Error("Couldn't identify the event in this PDF. Please upload a test with its title page.");
  return {
    event,
    division: m?.division === "C" ? "C" : DEFAULT_DIVISION,
    year: typeof m?.year === "number" && Number.isInteger(m.year) && m.year >= 1900 && m.year <= 2100 ? m.year : null,
    tournament: typeof m?.tournament === "string" && m.tournament.trim() ? m.tournament.trim().slice(0, 120) : null,
    level: LEVELS.find((l) => l === m?.level) ?? null,
  };
}

export function pdfPairName(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/\b(answer[ _-]*key|keys?|answers?|solutions?|test|questions?)\b/gi, " ").replace(/[-_()]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export const isAnswerKey = (name: string) => /\b(keys?|answers?|solutions?)\b/i.test(name.replace(/[_-]/g, " "));

export function publicPdfUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !host.includes(".") || /[\[\]:]/.test(host) || /^[\d.]+$/.test(host) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) {
    throw new Error("Use a public HTTPS PDF link or a Google Drive link.");
  }
  return url;
}