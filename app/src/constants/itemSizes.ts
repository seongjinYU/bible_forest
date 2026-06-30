import type { ThemeKey } from "./themes";

// 각 테마 아이템은 원본(나무/행성/해양생물) 크기 편차가 커서, 일괄 고정 크기로
// 렌더링하면 작은 원본이 확대되어 화질이 깨진다.
// 원본 픽셀 크기(긴 변 기준)에 비례해(완만한 sqrt 스케일) 표시 크기를 다르게 둔다.
const FOREST_ITEM_SIZE: Record<number, number> = {
  1: 61,
  2: 56,
  3: 58,
  4: 49,
  5: 50,
  6: 48,
  7: 45,
  8: 41,
  9: 47,
  10: 55,
  11: 45,
  12: 45,
  13: 48,
  14: 39,
  15: 44,
  16: 48,
  17: 52,
  18: 40,
  19: 44,
  20: 41,
  21: 42,
  22: 46,
  23: 42,
  24: 43,
  25: 40,
};

const NIGHT_ITEM_SIZE: Record<number, number> = {
  1: 72,
  2: 72,
  3: 59,
  4: 48,
  5: 66,
  6: 42,
  7: 39,
  8: 43,
  9: 57,
  10: 57,
  11: 41,
  12: 44,
  13: 49,
  14: 39,
  15: 24,
  16: 47,
  17: 47,
  18: 30,
  19: 68,
  20: 56,
  21: 46,
  22: 51,
  23: 66,
  24: 72,
  25: 72,
};

const OCEAN_ITEM_SIZE: Record<number, number> = {
  1: 41,
  2: 34,
  3: 54,
  4: 54,
  5: 46,
  6: 51,
  7: 50,
  8: 51,
  9: 52,
  10: 49,
  11: 51,
  12: 49,
  13: 50,
  14: 43,
  15: 69,
  16: 33,
  17: 33,
  18: 41,
  19: 54,
  20: 47,
  21: 64,
  22: 58,
  23: 41,
  24: 55,
  25: 52,
  26: 31,
};

const ITEM_SIZE_BY_THEME: Partial<Record<ThemeKey, Record<number, number>>> = {
  forest: FOREST_ITEM_SIZE,
  night: NIGHT_ITEM_SIZE,
  ocean: OCEAN_ITEM_SIZE,
};

const DEFAULT_ITEM_SIZE = 48;

export function getItemDisplaySize(theme: ThemeKey, species: number): number {
  return ITEM_SIZE_BY_THEME[theme]?.[species] ?? DEFAULT_ITEM_SIZE;
}
