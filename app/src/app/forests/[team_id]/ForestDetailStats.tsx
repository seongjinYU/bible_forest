"use client";

import { useState, useRef, useEffect } from "react";
import type { ThemeKey } from "@/constants/themes";
import { THEMES } from "@/constants/themes";

interface Participant {
  nickname: string;
  score: number;
  joinedAt: string;
}

interface Props {
  theme: ThemeKey;
  teamName: string;
  treeCount: number;
  score: number;
  participants: Participant[];
}

const AVATAR_PALETTE = [
  { bg: "#B8E4DA", fg: "#0F6B55" },
  { bg: "#F5C5A8", fg: "#B5451A" },
  { bg: "#F5DDB8", fg: "#8B5A10" },
  { bg: "#D4B8F5", fg: "#5A1A9B" },
  { bg: "#B8D9F5", fg: "#1A3A8B" },
  { bg: "#F5B8D4", fg: "#9B1A5A" },
];

const SUBJECT_PARTICLE: Record<ThemeKey, string> = {
  forest: "은",
  night: "은",
  ocean: "는",
};

export default function ForestDetailStats({ theme, teamName, treeCount, score, participants }: Props) {
  const currentTheme = THEMES[theme];
  const isDarkBg = theme !== "forest";
  const particle = SUBJECT_PARTICLE[theme];

  const [showParticipants, setShowParticipants] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const sheetDragStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetScrollRef = useRef<HTMLDivElement>(null);

  const glassCard = isDarkBg
    ? "bg-white/10 backdrop-blur-md border border-white/10"
    : "bg-white/20 backdrop-blur-[2px] border border-white/40";

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !showParticipants) return;
    const onTouchMove = (e: TouchEvent) => {
      if (sheetDragStartY.current === null) return;
      const dy = e.touches[0].clientY - sheetDragStartY.current;
      if (dy <= 0) return;
      e.preventDefault();
      setSheetDragY(dy);
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [showParticipants]);

  return (
    <>
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

          <button onClick={() => setShowParticipants(true)} className="flex items-center gap-2 text-left">
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

      {showParticipants && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => { setShowParticipants(false); setSheetDragY(0); }}
        >
          <div
            ref={sheetRef}
            className="w-full bg-white rounded-t-[20px] h-[50vh] flex flex-col"
            style={{ transform: `translateY(${Math.max(0, sheetDragY)}px)`, transition: sheetDragStartY.current !== null ? "none" : "transform 0.25s ease" }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              const atTop = (sheetScrollRef.current?.scrollTop ?? 0) === 0;
              sheetDragStartY.current = atTop ? e.touches[0].clientY : null;
            }}
            onTouchEnd={() => {
              if (sheetDragY > 80) {
                setShowParticipants(false);
                setSheetDragY(0);
              } else {
                setSheetDragY(0);
              }
              sheetDragStartY.current = null;
            }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </div>
            <div className="px-5 py-3 flex items-center justify-between shrink-0">
              <h2 className="text-[17px] font-semibold font-pretendard text-[#222222]">팀 참여 현황</h2>
              <span className="text-[14px] font-pretendard text-[#AAAAAA]">{participants.length}명</span>
            </div>
            <div ref={sheetScrollRef} className="overflow-y-auto pb-safe">
              {participants.map((p, i) => {
                const { bg, fg } = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
                const d = new Date(p.joinedAt);
                const dateLabel = `${String(d.getFullYear()).slice(-2)}.${d.getMonth() + 1}.${d.getDate()}`;
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#F0F0F0] last:border-0">
                    <div
                      className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[17px] font-semibold font-pretendard shrink-0"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      {p.nickname[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-semibold font-pretendard text-[#222222] truncate">
                        {p.nickname} · {p.score}점
                      </p>
                      <p className="text-[13px] font-pretendard text-[#AAAAAA] mt-0.5">{dateLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
