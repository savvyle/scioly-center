/** 2027 National Tournament conflict blocks (soinc.org). A student may pick at most one event per group. */
export const CONFLICT_BLOCKS: Record<"B" | "C", string[][]> = {
  B: [
    ["Codebusters", "Disease Detectives", "Remote Sensing"],
    ["Water Quality", "Experimental Design", "Solar System"],
    ["Botany", "Meteorology"],
    ["Circuit Lab", "Dynamic Planet", "Food Science"],
    ["Heredity", "Rocks and Minerals", "Thermodynamics"],
    ["Anatomy & Physiology", "Crime Busters", "Write It Do It"],
    ["Boomilever", "Elastic Launched Glider", "Hovercraft", "Ping Pong Parachute", "Roller Coaster", "Scrambler"],
  ],
  C: [
    ["Anatomy & Physiology", "Engineering CAD", "Forensics"],
    ["Codebusters", "Disease Detectives", "Remote Sensing"],
    ["Astronomy", "Botany", "Experimental Design"],
    ["Chemistry Lab", "Rocks and Minerals"],
    ["Circuit Lab", "Protein Modeling", "Water Quality"],
    ["Designer Genes", "Dynamic Planet", "Thermodynamics"],
    ["Boomilever", "Electric Vehicle", "Hovercraft", "Mission Possible", "Ping Pong Parachute", "Wright Stuff"],
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

export function groupOf(division: "B" | "C", event: string): number | null {
  const i = CONFLICT_BLOCKS[division].findIndex((g) => g.some((e) => norm(e) === norm(event)));
  return i < 0 ? null : i + 1;
}

/** Returns the already-picked event that blocks `event`, if any. */
export function conflictWith(division: "B" | "C", picked: string[], event: string): string | null {
  const g = groupOf(division, event);
  if (!g) return null;
  return picked.find((p) => norm(p) !== norm(event) && groupOf(division, p) === g) ?? null;
}
