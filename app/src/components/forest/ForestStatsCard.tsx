"use client";

import { useRouter } from "next/navigation";
import type { ThemeKey } from "@/constants/themes";
import { THEMES } from "@/constants/themes";
import ParticipantAvatars, { type Participant } from "./ParticipantAvatars";

const PROGRESS_GRADIENT: Record<ThemeKey, string> = {
  forest: "linear-gradient(90deg, #0FC8B8 0%, #13BD7F 100%)",
  night: "linear-gradient(90deg, #632AFF 0%, #E18DFF 100%)",
  ocean: "linear-gradient(90deg, #008DFF 0%, #9A47FF 100%)",
};

interface ProgressInfo {
  totalChapters: number;
  /** Date.now() 기준 마지막 읽기와의 일수 차이 — 호출부에서 미리 계산해 전달한다. */
  diffDays: number | null;
}

interface ForestStatsCardProps {
  theme: ThemeKey;
  statPhrase: string;
  treeCount: number;
  score: number;
  participants: Participant[];
  /** 자기 팀일 때만 진행률 바 + 인증하기 버튼을 보여준다. */
  progress?: ProgressInfo;
  /** 클릭/라우팅 가능 여부. 미리보기 등 정적 표시 용도에서는 false. */
  interactive?: boolean;
  teamId?: string;
  className?: string;
}

export default function ForestStatsCard({
  theme,
  statPhrase,
  treeCount,
  score,
  participants,
  progress,
  interactive = true,
  teamId,
  className,
}: ForestStatsCardProps) {
  const router = useRouter();
  const isDarkBg = theme !== "forest";
  const currentTheme = THEMES[theme];
  const glassCard = "bg-[#FFFFFF1A] backdrop-blur-[1px] border-[0.5px] border-white";

  const done = progress ? progress.totalChapters % 10 : 0;
  const completed = progress ? progress.totalChapters >= 260 : false;
  const progressPct = completed ? 100 : (done / 10) * 100;
  const diffDays = progress?.diffDays ?? null;
  const nudge =
    diffDays === null
      ? null
      : diffDays === 0
      ? "오늘 인증했어요"
      : diffDays === 1
      ? "어제 마지막으로 인증했어요"
      : `${diffDays}일째 인증을 안 했어요`;
  const isWarning = diffDays !== null && diffDays >= 2;

  function goParticipants() {
    if (!interactive || !teamId) return;
    router.push(`/forests/${teamId}/participants`, { transitionTypes: ["nav-forward"] });
  }

  return (
    <div className={className ?? "absolute bottom-0 left-0 right-0 px-6 pb-2"}>
      <div className={`rounded-[8px] px-5 py-4 ${glassCard}`}>
        <p className={`text-[15px] font-pretendard mb-0.5 ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
          {statPhrase}
        </p>
        <div className="flex items-center gap-[3px] mb-3">
          <span className={`text-[18px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
            {treeCount}
          </span>
          <span className={`text-[15px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>{currentTheme.unit}</span>
          <div className={`w-1 h-1 rounded-full mx-[5px] ${isDarkBg ? "bg-white/60" : "bg-[#2E9200]"}`} />
          <span className={`text-[18px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
            {score}
          </span>
          <span className={`text-[15px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>점</span>
        </div>

        {progress && (
          <div className="flex flex-col gap-1 mb-3">
            <span className={`text-[14px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
              {completed ? "신약일독 완료" : "다음 아이템 획득까지"}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/60">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progressPct}%`, background: PROGRESS_GRADIENT[theme] }}
                />
              </div>
              <span className={`text-[13px] font-semibold font-pretendard shrink-0 ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                {completed ? "260/260" : `${done}/10`}
              </span>
            </div>
            {nudge && (
              <p
                className="text-[12px] font-pretendard text-right"
                style={
                  isWarning
                    ? { color: "#FF6B6B" }
                    : diffDays === 0
                    ? {
                        background: PROGRESS_GRADIENT[theme],
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        color: "transparent",
                      }
                    : { color: isDarkBg ? "rgba(255,255,255,0.5)" : "#AAAAAA" }
                }
              >
                {nudge}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={goParticipants} className="flex items-center gap-2 text-left" disabled={!interactive}>
            <span className={`text-[14px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>참여중</span>
            <ParticipantAvatars participants={participants} />
          </button>
          {progress && (
            interactive ? (
              <button
                onClick={() => router.push("/reading", { transitionTypes: ["nav-forward"] })}
                className="w-[76px] h-[34px] rounded-[20px] py-2 px-[14px] flex items-center justify-center text-white font-pretendard"
                style={{ backgroundColor: currentTheme.color, fontWeight: 400, fontSize: 14, lineHeight: "150%", letterSpacing: "-0.025em" }}
              >
                인증하기
              </button>
            ) : (
              <div
                className="w-[76px] h-[34px] rounded-[20px] py-2 px-[14px] flex items-center justify-center text-white font-pretendard"
                style={{ backgroundColor: currentTheme.color, fontWeight: 400, fontSize: 14, lineHeight: "150%", letterSpacing: "-0.025em" }}
              >
                인증하기
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
