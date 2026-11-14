export const EVENTS = [
  "Anatomy & Physiology", "Astronomy", "Boomilever", "Bungee Drop", "Chemistry Lab", "Circuit Lab",
  "Codebusters", "Designer Genes", "Disease Detectives", "Dynamic Planet", "Ecology", "Entomology",
  "Experimental Design", "Forensics", "Fossils", "Geologic Mapping", "Heredity", "Helicopter",
  "Materials Science", "Meteorology", "Metric Mastery", "Microbe Mission", "Optics", "Potions and Poisons",
  "Reach for the Stars", "Remote Sensing", "Rocks and Minerals", "Solar System", "Water Quality",
  "Wind Power", "Write It Do It", "Machines", "Hovercraft", "Electric Vehicle", "Tower",
] as const;
export const LEVELS = ["Invitational", "Regional", "State", "National"] as const;
export const DIFFICULTY = { 1: "Easy", 2: "Medium", 3: "Hard" } as Record<number, string>;
