"use client";

import Link from "next/link";
import type { ThemeKey } from "@/constants/themes";
import { THEMES } from "@/constants/themes";

interface ForumsCtaProps {
  theme: ThemeKey;
  /** false면 클릭 불가한 정적 표시(미리보기용)로만 렌더링. */
  interactive?: boolean;
  className?: string;
}

export default function ForumsCta({ theme, interactive = true, className }: ForumsCtaProps) {
  const currentTheme = THEMES[theme];
  const wrapperClass = className ?? "px-6 pt-2";
  const buttonClass = "w-full h-[48px] rounded-[8px] text-[16px] font-pretendard text-white flex items-center justify-center";

  return (
    <div className={wrapperClass} style={{ paddingBottom: "max(15px, env(safe-area-inset-bottom))" }}>
      {interactive ? (
        <Link
          href="/forests"
          transitionTypes={["nav-forward"]}
          className={`press-fx ${buttonClass}`}
          style={{ backgroundColor: currentTheme.color }}
        >
          {currentTheme.forumsLabel}
        </Link>
      ) : (
        <div className={buttonClass} style={{ backgroundColor: currentTheme.color }}>
          {currentTheme.forumsLabel}
        </div>
      )}
    </div>
  );
}
