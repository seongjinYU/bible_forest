"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

type PlantedTree = { species: string; x: number; y: number };
type TeamStat = { id: string; name: string; score: number; tree_count: number; theme: string | null; plantedTrees: PlantedTree[] };

function TeamCard({
  team,
  isMyTeam,
  onClickView,
}: {
  team: TeamStat;
  isMyTeam: boolean;
  onClickView: () => void;
}) {
  return (
    <button
      onClick={onClickView}
      className="w-full rounded-[20px] px-4 py-4 flex flex-col gap-3 text-left bg-white border border-[#EEF6F1]"
      style={{ boxShadow: "0px 0px 10px 0px #0FC8B84D" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[16px] font-bold text-[#222222] font-noto leading-none flex items-center gap-1.5">
          {team.name}
          {isMyTeam && (
            <span
              className="px-1.5 py-[3px] rounded-[4px] text-[10px] font-bold font-pretendard text-white leading-none"
              style={{ backgroundColor: "#13DB7F" }}
            >
              My
            </span>
          )}
        </p>
        <ChevronRight size={18} className="text-[#CCCCCC]" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#AAAAAA] font-pretendard">아이템</span>
          <span className="text-[14px] text-[#555555] font-pretendard font-medium">{team.tree_count}개</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#AAAAAA] font-pretendard">점수</span>
          <span className="text-[14px] text-[#13BD7F] font-pretendard font-bold">{team.score}점</span>
        </div>
      </div>
    </button>
  );
}

export default function ForestsCardGrid({
  teams,
  myTeamId,
  header,
}: {
  teams: TeamStat[];
  myTeamId: string;
  header?: React.ReactNode;
}) {
  const router = useRouter();
  const [showNoThemePopup, setShowNoThemePopup] = useState(false);

  const leftCol = teams.slice(0, 3);
  const rightCol = teams.slice(3);

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
          {header}
          {leftCol.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isMyTeam={team.id === myTeamId}
              onClickView={() => handleView(team)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {rightCol.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isMyTeam={team.id === myTeamId}
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
