import { describe, it, expect } from "vitest";
import {
  normalizeBooksInput,
  validateAndDedupeBooks,
  computeNormalTreeTarget,
  computeNextTreeRemaining,
  isBibleCompleted,
  resolveBibleCompletionFlag,
} from "@/lib/bible-progress";

describe("normalizeBooksInput", () => {
  it("다권 books 배열은 그대로 반환한다", () => {
    const books = [{ book_name: "마태복음", chapters: [1, 2] }];
    expect(normalizeBooksInput({ books })).toBe(books);
  });

  it("단권(book_name/chapters)은 배열 하나로 감싼다", () => {
    expect(normalizeBooksInput({ book_name: "마태복음", chapters: [1] })).toEqual([
      { book_name: "마태복음", chapters: [1] },
    ]);
  });

  it("둘 다 없으면 null", () => {
    expect(normalizeBooksInput({})).toBeNull();
  });
});

describe("validateAndDedupeBooks", () => {
  it("빈 배열은 no_books", () => {
    const result = validateAndDedupeBooks([]);
    expect(result).toEqual({ ok: false, reason: "no_books" });
  });

  it("존재하지 않는 책 이름은 invalid_book_or_chapter", () => {
    const result = validateAndDedupeBooks([{ book_name: "없는책", chapters: [1] }]);
    expect(result).toEqual({ ok: false, reason: "invalid_book_or_chapter" });
  });

  it("권의 장수를 초과하는 chapter는 invalid_book_or_chapter (빌레몬서=1장)", () => {
    const result = validateAndDedupeBooks([{ book_name: "빌레몬서", chapters: [2] }]);
    expect(result).toEqual({ ok: false, reason: "invalid_book_or_chapter" });
  });

  it("chapter가 0 이하이거나 정수가 아니면 invalid_book_or_chapter", () => {
    expect(validateAndDedupeBooks([{ book_name: "마태복음", chapters: [0] }])).toEqual({
      ok: false,
      reason: "invalid_book_or_chapter",
    });
    expect(validateAndDedupeBooks([{ book_name: "마태복음", chapters: [1.5] }])).toEqual({
      ok: false,
      reason: "invalid_book_or_chapter",
    });
  });

  it("chapters가 배열이 아니면 invalid_shape", () => {
    const result = validateAndDedupeBooks([
      { book_name: "마태복음", chapters: "1" as unknown as number[] },
    ]);
    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
  });

  it("중복 chapter는 dedupe하고 오름차순 정렬한다", () => {
    const result = validateAndDedupeBooks([
      { book_name: "마태복음", chapters: [3, 1, 2, 2, 1] },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.books.get("마태복음")).toEqual([1, 2, 3]);
    }
  });

  it("같은 책이 두 번 들어오면 마지막 항목으로 덮어쓴다", () => {
    const result = validateAndDedupeBooks([
      { book_name: "마태복음", chapters: [1] },
      { book_name: "마태복음", chapters: [5] },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.books.get("마태복음")).toEqual([5]);
    }
  });
});

describe("computeNormalTreeTarget", () => {
  it("10장당 나무 1그루", () => {
    expect(computeNormalTreeTarget(0)).toBe(0);
    expect(computeNormalTreeTarget(9)).toBe(0);
    expect(computeNormalTreeTarget(10)).toBe(1);
    expect(computeNormalTreeTarget(99)).toBe(9);
    expect(computeNormalTreeTarget(260)).toBe(26);
  });
});

describe("computeNextTreeRemaining", () => {
  it("다음 나무까지 남은 장수를 계산한다", () => {
    expect(computeNextTreeRemaining(0, 0)).toBe(10);
    expect(computeNextTreeRemaining(0, 7)).toBe(3);
    expect(computeNextTreeRemaining(2, 20)).toBe(10);
  });
});

describe("isBibleCompleted", () => {
  it("260장 미만은 미완료", () => {
    expect(isBibleCompleted(259)).toBe(false);
  });
  it("260장 이상은 완료", () => {
    expect(isBibleCompleted(260)).toBe(true);
    expect(isBibleCompleted(261)).toBe(true);
  });
});

describe("resolveBibleCompletionFlag", () => {
  it("260장 최초 달성 시 최초 1회만 newlyCompleted:true", () => {
    expect(resolveBibleCompletionFlag(260, false)).toEqual({
      nextFlag: true,
      newlyCompleted: true,
    });
  });

  it("이미 알림 받은 상태에서 다시 260장 이상이면 재알림하지 않는다", () => {
    expect(resolveBibleCompletionFlag(260, true)).toEqual({
      nextFlag: true,
      newlyCompleted: false,
    });
  });

  it("체크 해제로 260장 밑으로 내려가면 플래그를 되돌린다", () => {
    expect(resolveBibleCompletionFlag(259, true)).toEqual({
      nextFlag: false,
      newlyCompleted: false,
    });
  });

  it("애초에 미완료 상태면 아무 변화 없다", () => {
    expect(resolveBibleCompletionFlag(100, false)).toEqual({
      nextFlag: false,
      newlyCompleted: false,
    });
  });
});
