import type { ThemeKey } from "./themes";

export type Rank = "B" | "A" | "S";

export const RANK_WEIGHT: Record<Rank, number> = {
  B: 65,
  A: 30,
  S: 5,
};

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let n = start; n <= end; n++) out.push(n);
  return out;
}

const SPECIES_RANKS: Record<ThemeKey, Record<Rank, number[]>> = {
  forest: {
    B: range(1, 10),
    A: range(11, 19),
    S: range(20, 25),
  },
  night: {
    B: range(1, 10),
    A: range(11, 20),
    S: range(21, 25),
  },
  ocean: {
    B: range(4, 15),
    A: [...range(1, 3), ...range(23, 26)],
    S: range(16, 22),
  },
};

const SPECIES_TO_RANK: Record<ThemeKey, Record<number, Rank>> = Object.fromEntries(
  (Object.keys(SPECIES_RANKS) as ThemeKey[]).map((theme) => {
    const bySpecies: Record<number, Rank> = {};
    (Object.keys(SPECIES_RANKS[theme]) as Rank[]).forEach((rank) => {
      SPECIES_RANKS[theme][rank].forEach((species) => { bySpecies[species] = rank; });
    });
    return [theme, bySpecies];
  }),
) as Record<ThemeKey, Record<number, Rank>>;

export function getSpeciesRank(theme: ThemeKey, species: number): Rank | null {
  return SPECIES_TO_RANK[theme]?.[species] ?? null;
}

export function getSpeciesByRank(theme: ThemeKey, rank: Rank): number[] {
  return SPECIES_RANKS[theme][rank];
}
