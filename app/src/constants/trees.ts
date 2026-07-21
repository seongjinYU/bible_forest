import type { ThemeKey } from "./themes";
import { RANK_WEIGHT, getSpeciesByRank, type Rank } from "./rankings";

export const REWARD = {
  NORMAL_TREE_POINTS: 1,
} as const;

// 등급(B/A/S)별 가중치로 먼저 등급을 뽑고, 그 등급 안에서 species를 균등하게 뽑는다.
export function pickRandomSpecies(theme: ThemeKey): string {
  const ranks = Object.keys(RANK_WEIGHT) as Rank[];
  const totalWeight = ranks.reduce((sum, r) => sum + RANK_WEIGHT[r], 0);
  let roll = Math.random() * totalWeight;
  let chosenRank: Rank = ranks[ranks.length - 1];
  for (const rank of ranks) {
    if (roll < RANK_WEIGHT[rank]) { chosenRank = rank; break; }
    roll -= RANK_WEIGHT[rank];
  }

  const pool = getSpeciesByRank(theme, chosenRank);
  const species = pool[Math.floor(Math.random() * pool.length)];
  return String(species);
}
