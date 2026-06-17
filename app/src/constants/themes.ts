export type ThemeKey = "tree" | "star" | "music";

export const THEMES: Record<ThemeKey, {
  label: string;
  icon: string;
  pageBackground: string;
}> = {
  tree: {
    label: "나무",
    icon: "🌳",
    pageBackground: "#FFFFFF",
  },
  star: {
    label: "별",
    icon: "⭐",
    pageBackground: "linear-gradient(180deg, #2D0566 0%, #7B3FC8 100%)",
  },
  music: {
    label: "음표",
    icon: "🎵",
    pageBackground: "#FFFFFF",
  },
};

export const THEME_STORAGE_KEY = "main_theme";
