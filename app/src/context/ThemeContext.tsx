"use client";

import { createContext, useContext } from "react";
import type { ThemeKey } from "@/constants/themes";

const ThemeContext = createContext<ThemeKey>("tree");

export function ThemeProvider({
  theme,
  children,
}: {
  theme: ThemeKey;
  children: React.ReactNode;
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeKey {
  return useContext(ThemeContext);
}
