import { describe, it, expect } from "vitest";
import { getSpeciesRank, getSpeciesByRank, RANK_WEIGHT } from "@/constants/rankings";

describe("getSpeciesRank", () => {
  it("forest 테마: 1~10=B, 11~19=A, 20~25=S", () => {
    expect(getSpeciesRank("forest", 1)).toBe("B");
    expect(getSpeciesRank("forest", 10)).toBe("B");
    expect(getSpeciesRank("forest", 11)).toBe("A");
    expect(getSpeciesRank("forest", 19)).toBe("A");
    expect(getSpeciesRank("forest", 20)).toBe("S");
    expect(getSpeciesRank("forest", 25)).toBe("S");
  });

  it("ocean 테마: 등급별 구간이 연속 range가 아니어도 정확히 매핑된다", () => {
    // ocean은 A 등급이 [1~3, 23~26] 두 구간으로 나뉘어 있다 — 이 특이 케이스를 고정해둔다.
    expect(getSpeciesRank("ocean", 2)).toBe("A");
    expect(getSpeciesRank("ocean", 25)).toBe("A");
    expect(getSpeciesRank("ocean", 10)).toBe("B");
    expect(getSpeciesRank("ocean", 20)).toBe("S");
  });

  it("등급 목록에 없는 species 번호는 null", () => {
    expect(getSpeciesRank("forest", 999)).toBeNull();
  });

  it("같은 species 번호라도 테마가 다르면 등급이 다를 수 있다", () => {
    // forest 11=A, ocean 11=B — 테마별 매핑이 서로 섞이지 않는지 확인.
    expect(getSpeciesRank("forest", 11)).toBe("A");
    expect(getSpeciesRank("ocean", 11)).toBe("B");
  });
});

describe("getSpeciesByRank", () => {
  it("forest B등급 pool은 1~10 전부를 포함한다", () => {
    expect(getSpeciesByRank("forest", "B")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("모든 테마의 모든 등급 pool은 비어있지 않다 (추첨 시 빈 배열 인덱싱 방지)", () => {
    const themes = ["forest", "night", "ocean"] as const;
    const ranks = ["B", "A", "S"] as const;
    for (const theme of themes) {
      for (const rank of ranks) {
        expect(getSpeciesByRank(theme, rank).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("RANK_WEIGHT", () => {
  it("가중치 합은 100이다 (확률 계산의 전제)", () => {
    const total = RANK_WEIGHT.B + RANK_WEIGHT.A + RANK_WEIGHT.S;
    expect(total).toBe(100);
  });

  it("S등급(전설)이 가장 희귀하다", () => {
    expect(RANK_WEIGHT.S).toBeLessThan(RANK_WEIGHT.A);
    expect(RANK_WEIGHT.A).toBeLessThan(RANK_WEIGHT.B);
  });
});
