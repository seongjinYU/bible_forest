import { describe, it, expect } from "vitest";
import { getAvatarInitial } from "@/lib/avatarInitial";

describe("getAvatarInitial", () => {
  it("한글 닉네임은 첫 글자를 그대로 반환한다", () => {
    expect(getAvatarInitial("이찬희")).toBe("이");
  });

  it("영문 닉네임은 첫 글자를 그대로 반환한다", () => {
    expect(getAvatarInitial("jjuinggum")).toBe("j");
  });

  it("단순 이모지로 시작하면 빈 문자열을 반환한다 (글자 없이 색상만)", () => {
    expect(getAvatarInitial("🔥불태워")).toBe("");
  });

  it("스킨톤 변형 이모지(서로게이트 페어 + 수정자)도 빈 문자열을 반환한다", () => {
    // 👍🏽 = U+1F44D U+1F3FD, 여러 UTF-16 코드 유닛으로 구성됨
    expect(getAvatarInitial("👍🏽좋아요")).toBe("");
  });

  it("ZWJ로 결합된 이모지(가족 이모지)도 빈 문자열을 반환한다", () => {
    // 👨‍👩‍👧‍👦 = 여러 이모지가 ZWJ(U+200D)로 결합된 하나의 grapheme
    expect(getAvatarInitial("👨‍👩‍👧‍👦가족")).toBe("");
  });

  it("국기 이모지(지역표시문자 2개 조합)도 빈 문자열을 반환한다", () => {
    expect(getAvatarInitial("🇰🇷대한민국")).toBe("");
  });

  it("앞뒤 공백은 무시하고 첫 글자를 찾는다", () => {
    expect(getAvatarInitial("  성경")).toBe("성");
  });

  it("빈 문자열/공백만 있으면 빈 문자열을 반환한다", () => {
    expect(getAvatarInitial("")).toBe("");
    expect(getAvatarInitial("   ")).toBe("");
  });
});
