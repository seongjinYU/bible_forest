import { NT_BOOKS, TOTAL_NT_CHAPTERS } from "@/constants/bible";

// ┌─────────────────────────────────────────────────────────────────┐
// │  PATCH /api/v1/bible/progress에서 쓰는 순수 검증/계산 로직.        │
// │  DB 호출 없이 입력→출력만으로 결정되는 부분만 여기 모아 테스트한다. │
// └─────────────────────────────────────────────────────────────────┘

export type RawBookInput = { book_name?: unknown; chapters?: unknown };
export type ParsedBooks = Map<string, number[]>;

/** PATCH 요청 본문(다권/단권)을 books 배열로 정규화한다. 형식 자체가 틀렸으면 null. */
export function normalizeBooksInput(body: {
  books?: unknown;
  book_name?: unknown;
  chapters?: unknown;
}): RawBookInput[] | null {
  if (Array.isArray(body.books)) {
    return body.books as RawBookInput[];
  }
  if (typeof body.book_name === "string") {
    return [{ book_name: body.book_name, chapters: body.chapters }];
  }
  return null;
}

export type ValidateBooksResult =
  | { ok: true; books: ParsedBooks }
  | { ok: false, reason: "invalid_shape" | "no_books" | "invalid_book_or_chapter" };

/** 각 권/장 번호를 검증하고, 같은 권 중복 시 마지막 것을 사용해 dedupe한다. */
export function validateAndDedupeBooks(list: RawBookInput[]): ValidateBooksResult {
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, reason: "no_books" };
  }

  const bookMap: ParsedBooks = new Map();
  for (const b of list) {
    if (typeof b.book_name !== "string" || !Array.isArray(b.chapters)) {
      return { ok: false, reason: "invalid_shape" };
    }
    const book = NT_BOOKS.find((x) => x.name === b.book_name);
    if (!book) {
      return { ok: false, reason: "invalid_book_or_chapter" };
    }
    const set = new Set<number>();
    for (const c of b.chapters) {
      if (typeof c !== "number" || !Number.isInteger(c) || c < 1 || c > book.chapters) {
        return { ok: false, reason: "invalid_book_or_chapter" };
      }
      set.add(c);
    }
    bookMap.set(b.book_name, [...set].sort((a, b2) => a - b2));
  }

  return { ok: true, books: bookMap };
}

/** 총 장수 기준 일반 나무 지급 목표 개수. */
export function computeNormalTreeTarget(totalChapters: number): number {
  return Math.floor(totalChapters / 10);
}

/** 다음 나무까지 남은 장수. */
export function computeNextTreeRemaining(treesEarned: number, totalChapters: number): number {
  return (treesEarned + 1) * 10 - totalChapters;
}

/** 신약 260장 완독 여부. */
export function isBibleCompleted(totalChapters: number): boolean {
  return totalChapters >= TOTAL_NT_CHAPTERS;
}

/**
 * 일독 완료 알림을 "최초 1회만" 새로 트리거해야 하는지 판정한다.
 * completed && 이전에 알림을 못 받았을 때만 true.
 * 진행률이 260장 밑으로 다시 내려가면 플래그를 되돌려야 하므로 그 여부도 함께 반환한다.
 */
export function resolveBibleCompletionFlag(
  totalChapters: number,
  previouslyNotified: boolean
): { nextFlag: boolean; newlyCompleted: boolean } {
  const completed = isBibleCompleted(totalChapters);
  if (completed && !previouslyNotified) {
    return { nextFlag: true, newlyCompleted: true };
  }
  if (!completed && previouslyNotified) {
    return { nextFlag: false, newlyCompleted: false };
  }
  return { nextFlag: previouslyNotified, newlyCompleted: false };
}
