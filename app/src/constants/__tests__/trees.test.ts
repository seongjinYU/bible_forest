import { describe, it, expect, vi, afterEach } from "vitest";
import { pickRandomSpecies } from "@/constants/trees";
import { getSpeciesRank } from "@/constants/rankings";

describe("pickRandomSpecies", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Math.random이 낮은 값이면 B등급(가중치 0~65)에서 뽑는다", () => {
    // roll = random * 100. random=0 -> roll=0 -> B 구간(0~65)의 시작.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0) // 등급 추첨: roll=0 -> B
      .mockReturnValueOnce(0); // pool 안에서 첫 번째 species 선택
    const species = pickRandomSpecies("forest");
    expect(getSpeciesRank("forest", Number(species))).toBe("B");
  });

  it("Math.random이 B/A 경계 바로 다음이면 A등급(가중치 65~95)에서 뽑는다", () => {
    // roll = 0.66 * 100 = 66 -> B(0~65) 지나 A 구간 진입
    vi.spyOn(Math, "random").mockReturnValueOnce(0.66).mockReturnValueOnce(0);
    const species = pickRandomSpecies("forest");
    expect(getSpeciesRank("forest", Number(species))).toBe("A");
  });

  it("Math.random이 A/S 경계 바로 다음이면 S등급(가중치 95~100)에서 뽑는다", () => {
    // roll = 0.96 * 100 = 96 -> B+A(0~95) 지나 S 구간 진입
    vi.spyOn(Math, "random").mockReturnValueOnce(0.96).mockReturnValueOnce(0);
    const species = pickRandomSpecies("forest");
    expect(getSpeciesRank("forest", Number(species))).toBe("S");
  });

  it("항상 숫자로 변환 가능한 species 문자열을 반환한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const species = pickRandomSpecies("forest");
    expect(Number.isNaN(Number(species))).toBe(false);
  });
});
