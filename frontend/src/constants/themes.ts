export type ThemeKey = "forest" | "night";

export const THEMES: Record<ThemeKey, { label: string; icon: string; gradient: string }> = {
  forest: {
    label: "숲",
    icon: "🌲",
    gradient: "linear-gradient(180deg, #FFFFFF 0%, #BCE5FF 86%)",
  },
  night: {
    label: "밤하늘",
    icon: "⭐",
    gradient: "linear-gradient(180deg, #1A0533 0%, #3B1F6B 86%)",
  },
};

export const THEME_ORDER: ThemeKey[] = ["forest", "night"];
export const THEME_STORAGE_KEY = "main_theme";
