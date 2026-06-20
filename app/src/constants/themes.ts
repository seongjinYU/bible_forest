export type ThemeKey = "forest" | "night" | "ocean";
export type ElementKey = "tree" | "star" | "marine";

export const THEMES: Record<ThemeKey, {
  label: string;
  icon: string;
  element: ElementKey;
  pageBackground: string;
  color: string;
}> = {
  forest: {
    label: "숲",
    icon: "🌳",
    element: "tree",
    pageBackground: "#FFFFFF",
    color: "#2E9200",
  },
  night: {
    label: "밤하늘",
    icon: "⭐",
    element: "star",
    pageBackground: "linear-gradient(180deg, #2D0566 0%, #7B3FC8 100%)",
    color: "#DE72E9",
  },
  ocean: {
    label: "바다",
    icon: "🌊",
    element: "marine",
    pageBackground: "#FFFFFF",
    color: "#6139FF",
  },
};

export const THEME_STORAGE_KEY = "main_theme";
