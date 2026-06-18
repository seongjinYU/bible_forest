export type ThemeKey = "forest" | "night" | "music";
export type ElementKey = "tree" | "star" | "note";

export const THEMES: Record<ThemeKey, {
  label: string;
  icon: string;
  element: ElementKey;
  pageBackground: string;
}> = {
  forest: {
    label: "숲",
    icon: "🌳",
    element: "tree",
    pageBackground: "#FFFFFF",
  },
  night: {
    label: "밤하늘",
    icon: "⭐",
    element: "star",
    pageBackground: "linear-gradient(180deg, #2D0566 0%, #7B3FC8 100%)",
  },
  music: {
    label: "악보",
    icon: "🎵",
    element: "note",
    pageBackground: "#FFFFFF",
  },
};

export const THEME_STORAGE_KEY = "main_theme";
