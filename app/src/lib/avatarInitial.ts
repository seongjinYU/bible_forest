// ┌─────────────────────────────────────────────────────────────────┐
// │  닉네임 첫 글자(그래핌 단위)를 안전하게 추출한다.                   │
// │  이모지(국기, 스킨톤 변형, ZWJ 결합 등 서로게이트 페어 조합)는       │
// │  글자 형태로 렌더링할 수 없으므로 빈 문자열을 반환해                │
// │  아바타에 색상 배경만 남고 글자는 표시하지 않도록 한다.             │
// └─────────────────────────────────────────────────────────────────┘

const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u;

/** 문자열의 첫 grapheme(사용자가 인지하는 글자 단위 하나)을 반환한다. */
function firstGrapheme(value: string): string {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const first = segmenter.segment(value)[Symbol.iterator]().next();
    if (!first.done) return first.value.segment;
  }
  // Segmenter 미지원 환경 폴백: 코드포인트 단위로라도 서로게이트 페어는 보존한다.
  return Array.from(value)[0] ?? "";
}

/**
 * 닉네임에서 아바타에 표시할 첫 글자를 뽑는다.
 * 이모지인 경우 렌더링할 문자가 없다는 뜻으로 빈 문자열을 반환한다.
 */
export function getAvatarInitial(nickname: string): string {
  const grapheme = firstGrapheme(nickname.trim());
  if (!grapheme || EMOJI_PATTERN.test(grapheme)) return "";
  return grapheme;
}
