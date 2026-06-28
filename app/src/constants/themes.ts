export type ThemeKey = "forest" | "night" | "ocean";
export type ElementKey = "tree" | "star" | "marine";

export const THEMES: Record<ThemeKey, {
  label: string;
  icon: string;
  element: ElementKey;
  pageBackground: string;
  color: string;
  statPhrase: string;
  unit: string;
  tagline: string;
  forumsLabel: string;
}> = {
  forest: {
    label: "숲",
    icon: "🌳",
    element: "tree",
    pageBackground: "#FFFFFF",
    color: "#2E9200",
    statPhrase: "현재 우리 숲은?",
    unit: "그루",
    tagline: "팀 영혼들과 함께 나무를 심어보세요!",
    forumsLabel: "다른 팀 구경하러 가기",
  },
  night: {
    label: "밤하늘",
    icon: "⭐",
    element: "star",
    pageBackground: "linear-gradient(180deg, #2D0566 0%, #7B3FC8 100%)",
    color: "#DE72E9",
    statPhrase: "현재 우리 밤하늘은?",
    unit: "개",
    tagline: "팀 영혼들과 함께 별을 심어보세요!",
    forumsLabel: "다른 팀 구경하러 가기",
  },
  ocean: {
    label: "바다",
    icon: "🌊",
    element: "marine",
    pageBackground: "#FFFFFF",
    color: "#6139FF",
    statPhrase: "현재 우리 바다는?",
    unit: "마리",
    tagline: "팀 영혼들과 함께 바다를 채워보세요!",
    forumsLabel: "다른 팀 구경하러 가기",
  },
};

export const THEME_STORAGE_KEY = "main_theme";
