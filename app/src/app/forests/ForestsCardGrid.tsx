"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeamColor = { primary: string; illus: string; border: string };
type PlantedTree = { species: string; x: number; y: number };
type TeamStat = { id: string; name: string; score: number; tree_count: number; theme: string | null; plantedTrees: PlantedTree[] };

const TEAM_COLORS: Record<string, TeamColor> = {
  "1팀": { primary: "#FF8A80", illus: "#FFF3F2", border: "#FFCDD2" },
  "2팀": { primary: "#F48FB1", illus: "#FFF0F5", border: "#F8BBD0" },
  "3팀": { primary: "#FFAC5F", illus: "#FFF8F0", border: "#FFE0B2" },
  "4팀": { primary: "#66BB6A", illus: "#F1FBF1", border: "#C8E6C9" },
  "5팀": { primary: "#64B5F6", illus: "#F0F7FF", border: "#BBDEFB" },
  "6팀": { primary: "#7986CB", illus: "#F3F4FB", border: "#C5CAE9" },
  "7팀": { primary: "#BA68C8", illus: "#F9F0FC", border: "#E1BEE7" },
};
const DEFAULT_COLOR: TeamColor = { primary: "#66BB6A", illus: "#F1FBF1", border: "#C8E6C9" };


function TeamCard({
  team,
  isMyTeam,
  color,
  onClickView,
}: {
  team: TeamStat;
  isMyTeam: boolean;
  color: TeamColor;
  onClickView: () => void;
}) {
  return (
    <div
      className="rounded-[20px] overflow-hidden flex flex-col"
      style={{
        background: "white",
        border: `2px solid ${isMyTeam ? color.primary : color.border}`,
        boxShadow: isMyTeam
          ? `0 4px 18px ${color.primary}40`
          : `0 2px 10px ${color.primary}20`,
      }}
    >
      {/* 썸네일 영역 */}
      <div className="relative overflow-hidden" style={{ height: 130, background: color.illus }}>
        {team.theme && (
          <img src={`/assets/${team.theme}/bg.png`} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {team.theme && team.plantedTrees.map((tree, i) => {
          const num = Number(tree.species);
          if (isNaN(num) || num <= 0) return null;
          return (
            <img
              key={i}
              src={`/assets/${team.theme}/${num}.png`}
              alt=""
              className="absolute w-7 h-7 object-contain pointer-events-none"
              style={{ left: `${tree.x}%`, top: `${tree.y}%`, transform: "translate(-50%, -90%)" }}
            />
          );
        })}
        {isMyTeam && (
          <span
            className="absolute z-10 top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-pretendard font-bold text-white leading-none"
            style={{ background: color.primary }}
          >
            우리 팀
          </span>
        )}
      </div>

      {/* 팀 정보 */}
      <div className="px-3.5 pt-2.5 pb-3 flex flex-col gap-1.5">
        <p className="text-[15px] font-bold text-[#222222] font-noto leading-none">{team.name}</p>
        <p className="text-[12px] font-pretendard leading-none" style={{ color: color.primary }}>
          {team.tree_count}그루
          <span className="mx-1 opacity-40">·</span>
          <span className="font-bold">{team.score}점</span>
        </p>
        <button
          onClick={onClickView}
          className="mt-1 w-full h-[34px] rounded-full flex items-center justify-center text-[13px] font-pretendard font-semibold text-white"
          style={{ background: color.primary }}
        >
          구경하기
        </button>
      </div>
    </div>
  );
}

export default function ForestsCardGrid({
  teams,
  myTeamId,
}: {
  teams: TeamStat[];
  myTeamId: string;
}) {
  const router = useRouter();
  const [showNoThemePopup, setShowNoThemePopup] = useState(false);

  const leftCol = teams.filter((_, i) => i % 2 === 0);
  const rightCol = teams.filter((_, i) => i % 2 === 1);

  function handleView(team: TeamStat) {
    if (team.id === myTeamId) {
      router.push("/", { transitionTypes: ["nav-back"] });
    } else if (!team.theme && team.score === 0 && team.tree_count === 0) {
      setShowNoThemePopup(true);
    } else {
      router.push(`/forests/${team.id}`, { transitionTypes: ["nav-forward"] });
    }
  }

  return (
    <>
      <div className="flex gap-3 items-start">
        <div className="flex flex-col gap-3 flex-1">
          {leftCol.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isMyTeam={team.id === myTeamId}
              color={TEAM_COLORS[team.name] ?? DEFAULT_COLOR}
              onClickView={() => handleView(team)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 flex-1 mt-20">
          {rightCol.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isMyTeam={team.id === myTeamId}
              color={TEAM_COLORS[team.name] ?? DEFAULT_COLOR}
              onClickView={() => handleView(team)}
            />
          ))}
        </div>
      </div>

      {showNoThemePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[358px] bg-white rounded-[8px] overflow-hidden">
            <div className="px-4 pt-9 pb-6 flex flex-col items-center gap-2">
              <h2 className="text-[20px] font-medium leading-[28px] tracking-[-0.03em] text-[#222222] text-center font-noto">
                팀이 아직 개설되지 않았습니다
              </h2>
              <p className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto">
                해당 팀의 테마가 아직 설정되지 않았어요
              </p>
            </div>
            <button
              onClick={() => setShowNoThemePopup(false)}
              className="w-full py-3 bg-[#31C678] text-white text-[18px] font-medium font-noto"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
