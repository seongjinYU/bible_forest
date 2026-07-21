// ┌─────────────────────────────────────────────────────────────────┐
// │  /reading 화면(ReadingClient)에서 쓰는 순수 계산 로직.             │
// │  DOM/React 상태 없이 입력→출력만으로 결정되는 부분만 여기 모은다.  │
// └─────────────────────────────────────────────────────────────────┘

export const READING_GRID_COLS = 6;

/** 선택된 장 번호들을 "1~3, 5장" 같은 축약 텍스트로 변환한다. */
export function formatChapters(chapters: number[]): string {
  if (chapters.length === 0) return "없음";
  const sorted = [...chapters].sort((a, b) => a - b);
  const ranges: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    ranges.push(j === i ? `${sorted[i]}` : `${sorted[i]}~${sorted[j]}`);
    i = j + 1;
  }
  return ranges.join(", ") + "장";
}

/**
 * 선택된 장들을 그리드에서 "알약(pill)" 형태로 이어붙일 연속 그룹으로 묶는다.
 * 같은 행(READING_GRID_COLS 배수 경계) 안에서 연속된 값만 하나의 그룹으로 합친다.
 */
export function buildPillGroups(sel: Set<number>, cols: number = READING_GRID_COLS): number[][] {
  const sorted = Array.from(sel).sort((a, b) => a - b);
  const groups: number[][] = [];
  let cur: number[] = [];
  for (const ch of sorted) {
    if (cur.length === 0) {
      cur.push(ch);
    } else {
      const prev = cur[cur.length - 1];
      const consecutive = ch === prev + 1;
      const startsNewRow = (ch - 1) % cols === 0;
      if (consecutive && !startsNewRow) cur.push(ch);
      else { groups.push(cur); cur = [ch]; }
    }
  }
  if (cur.length > 0) groups.push(cur);
  return groups;
}

/** 서버에서 받은 (book_name, chapter) row 목록을 책별 체크 Set으로 변환한다. */
export function buildProgressMap(
  rows: { book_name: string; chapter: number }[],
): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const { book_name, chapter } of rows) {
    if (!map.has(book_name)) map.set(book_name, new Set());
    map.get(book_name)!.add(chapter);
  }
  return map;
}

/** 두 Set의 원소가 완전히 같은지 비교한다 (dirty 여부 판정에 사용). */
export function setEquals(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/** 저장 시 몇 그루의 나무를 새로 획득/반납하게 되는지 계산한다. 음수면 반납. */
export function computeTreesDelta(currentTotal: number, draftTotal: number): number {
  return Math.floor(draftTotal / 10) - Math.floor(currentTotal / 10);
}

/** 다음 나무 획득까지 몇 장 더 필요한지 계산한다 (10장 단위, 0장이면 10장). */
export function computeChaptersUntilNext(draftTotal: number): number {
  return draftTotal % 10 === 0 ? 10 : 10 - (draftTotal % 10);
}
