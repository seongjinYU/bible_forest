"use client";

import { useRouter } from "next/navigation";
import type { ThemeKey } from "@/constants/themes";
import { THEMES } from "@/constants/themes";
import { AVATAR_PALETTE } from "@/constants/avatars";

interface Participant {
  nickname: string;
  score: number;
  joinedAt: string;
}

interface Props {
  theme: ThemeKey;
  teamId: string;
  teamName: string;
  treeCount: number;
  score: number;
  participants: Participant[];
}

const SUBJECT_PARTICLE: Record<ThemeKey, string> = {
  forest: "은",
  night: "은",
  ocean: "는",
};

export default function ForestDetailStats({ theme, teamId, teamName, treeCount, score, participants }: Props) {
  const router = useRouter();
  const currentTheme = THEMES[theme];
  const isDarkBg = theme !== "forest";
  const particle = SUBJECT_PARTICLE[theme];

  const glassCard = isDarkBg
    ? "bg-white/10 backdrop-blur-md border border-white/10"
    : "bg-white/20 backdrop-blur-[2px] border border-white/40";

  return (
    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
      <div className={`rounded-[20px] px-5 py-4 ${glassCard}`}>
        <p className={`text-[15px] font-pretendard mb-0.5 ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>
          현재 {teamName}의 {currentTheme.label}{particle}?
        </p>
        <div className="flex items-center gap-[3px] mb-3">
          <span className={`text-[24px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
            {treeCount}
          </span>
          <span className={`text-[24px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
            {currentTheme.unit}
          </span>
          <div className={`w-1 h-1 rounded-full mx-[5px] ${isDarkBg ? "bg-white/60" : "bg-[#2E9200]"}`} />
          <span className={`text-[24px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
            {score}
          </span>
          <span className={`text-[24px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>점</span>
        </div>

        <button
          onClick={() => router.push(`/forests/${teamId}/participants`, { transitionTypes: ["nav-forward"] })}
          className="flex items-center gap-2 text-left"
        >
          <span className={`text-[15px] font-pretendard ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>참여중</span>
          <div className="flex items-center">
            {participants.slice(0, 3).map((p, i) => {
              const { bg, fg } = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
              return (
                <div
                  key={i}
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-semibold font-pretendard border-[2px] border-white"
                  style={{ backgroundColor: bg, color: fg, marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }}
                >
                  {p.nickname[0]}
                </div>
              );
            })}
          </div>
          <span className={`text-[22px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>›</span>
        </button>
      </div>
    </div>
  );
}
