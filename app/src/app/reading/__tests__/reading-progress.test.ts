import { describe, it, expect } from "vitest";
import {
  formatChapters,
  buildPillGroups,
  buildProgressMap,
  setEquals,
  computeTreesDelta,
  computeChaptersUntilNext,
} from "@/app/reading/reading-progress";

describe("formatChapters", () => {
  it("빈 배열은 '없음'", () => {
    expect(formatChapters([])).toBe("없음");
  });

  it("연속된 장은 범위(~)로 축약한다", () => {
    expect(formatChapters([1, 2, 3])).toBe("1~3장");
  });

  it("떨어진 장은 쉼표로 나열한다", () => {
    expect(formatChapters([1, 3, 5])).toBe("1, 3, 5장");
  });

  it("연속 구간과 단독 장이 섞여도 올바르게 나눈다", () => {
    expect(formatChapters([1, 2, 3, 7, 9, 10])).toBe("1~3, 7, 9~10장");
  });

  it("입력 순서가 뒤죽박죽이어도 정렬 후 처리한다", () => {
    expect(formatChapters([3, 1, 2])).toBe("1~3장");
  });
});

describe("buildPillGroups", () => {
  it("같은 행(6열) 안에서 연속된 값만 하나의 그룹으로 묶는다", () => {
    const groups = buildPillGroups(new Set([1, 2, 3]));
    expect(groups).toEqual([[1, 2, 3]]);
  });

  it("행 경계(6의 배수)를 넘으면 그룹을 끊는다", () => {
    // 6장은 1행의 마지막(1~6), 7장은 2행의 시작 — 연속 값이라도 같은 그룹으로 묶이면 안 된다.
    const groups = buildPillGroups(new Set([5, 6, 7, 8]));
    expect(groups).toEqual([[5, 6], [7, 8]]);
  });

  it("떨어진 장들은 각각 별도 그룹(길이 1)이 된다", () => {
    const groups = buildPillGroups(new Set([1, 3, 5]));
    expect(groups).toEqual([[1], [3], [5]]);
  });

  it("빈 Set은 빈 배열을 반환한다", () => {
    expect(buildPillGroups(new Set())).toEqual([]);
  });
});

describe("buildProgressMap", () => {
  it("book_name별로 chapter를 Set으로 묶는다", () => {
    const map = buildProgressMap([
      { book_name: "마태복음", chapter: 1 },
      { book_name: "마태복음", chapter: 2 },
      { book_name: "마가복음", chapter: 1 },
    ]);
    expect(map.get("마태복음")).toEqual(new Set([1, 2]));
    expect(map.get("마가복음")).toEqual(new Set([1]));
  });

  it("빈 배열은 빈 Map을 반환한다", () => {
    expect(buildProgressMap([]).size).toBe(0);
  });
});

describe("setEquals", () => {
  it("같은 원소를 가진 Set은 순서와 무관하게 true", () => {
    expect(setEquals(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true);
  });

  it("크기가 다르면 false", () => {
    expect(setEquals(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
  });

  it("크기는 같아도 원소가 다르면 false", () => {
    expect(setEquals(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });

  it("둘 다 빈 Set이면 true", () => {
    expect(setEquals(new Set(), new Set())).toBe(true);
  });
});

describe("computeTreesDelta", () => {
  it("10장 단위를 넘길 때마다 나무 1그루씩 추가로 획득한다", () => {
    expect(computeTreesDelta(5, 15)).toBe(1);
    expect(computeTreesDelta(0, 25)).toBe(2);
  });

  it("장수가 줄어들어 기준 밑으로 내려가면 음수(반납)를 반환한다", () => {
    expect(computeTreesDelta(25, 5)).toBe(-2);
  });

  it("10장 단위를 넘지 않으면 0", () => {
    expect(computeTreesDelta(11, 15)).toBe(0);
  });
});

describe("computeChaptersUntilNext", () => {
  it("정확히 10의 배수면 다음 나무까지 10장 남음", () => {
    expect(computeChaptersUntilNext(0)).toBe(10);
    expect(computeChaptersUntilNext(20)).toBe(10);
  });

  it("나머지가 있으면 그만큼 뺀 값", () => {
    expect(computeChaptersUntilNext(23)).toBe(7);
  });
});
