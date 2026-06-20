import type { ThemeKey } from "./themes";

export const SPECIAL_SPECIES = "special";

export const REWARD = {
  NORMAL_TREE_POINTS: 1,
  SPECIAL_TREE_POINTS: 0,
} as const;

const SPECIES_COUNT: Record<ThemeKey, number> = {
  forest: 25,
  night:  25,
  ocean:  26,
};

export function pickRandomSpecies(theme: ThemeKey): string {
  const count = SPECIES_COUNT[theme];
  return String(Math.floor(Math.random() * count) + 1);
}
