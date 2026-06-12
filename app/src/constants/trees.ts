// 나무 종류·보상 관련 상수 (단일 소스 — A4·B4·A5)
// Supabase는 DB로만 쓰고, 나무 지급 로직은 백엔드(route)에서 처리하므로
// "랜덤 종류 선택"도 여기서 함(기존 DB 함수 pick_random_species 대체).

// 에셋 종류 키 (FE 에셋 파일명과 동기화 — 목록 확정 시 교체)
export const TREE_SPECIES = ["pine", "maple", "birch", "oak", "willow"] as const;

// 1독 특별 나무는 랜덤 풀에서 제외, 고정 키
export const SPECIAL_SPECIES = "special";

// 보상 점수 (B4). special 보너스 점수는 추후 확정(A5) → 임시 0.
export const REWARD = {
  NORMAL_TREE_POINTS: 1,
  SPECIAL_TREE_POINTS: 0,
} as const;

// 균등 랜덤으로 종류 1개 선택 (A4 ① 균등 랜덤)
export function pickRandomSpecies(): string {
  return TREE_SPECIES[Math.floor(Math.random() * TREE_SPECIES.length)];
}
