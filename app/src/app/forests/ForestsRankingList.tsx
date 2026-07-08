"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type PlantedTree = { species: string; x: number; y: number };
type TeamStat = { id: string; name: string; score: number; tree_count: number; theme: string | null; plantedTrees: PlantedTree[] };

// 1~3위 전용 고정 슬로건 문구
const TOP_SLOGANS: Record<number, string> = {
  1: "하나님의 말씀에 진심인",
  2: "한 마음으로 함께하는",
  3: "전심으로 참여하는",
};

function RankBadgeCircle({ rank }: { rank: number }) {
  const isTop = rank <= 3;
  return (
    <span
      className="flex items-center justify-center w-6 h-6 rounded-full text-[13px] font-bold font-pretendard shrink-0"
      style={
        isTop
          ? { backgroundColor: "#13BD7F", color: "#FFFFFF" }
          : { backgroundColor: "#EEEEEE", color: "#999999" }
      }
    >
      {rank}
    </span>
  );
}

function TeamRankRow({
  rank,
  team,
  isMyTeam,
  onClickView,
}: {
  rank: number;
  team: TeamStat;
  isMyTeam: boolean;
  onClickView: () => void;
}) {
  const isTop = rank <= 3;
  const slogan = TOP_SLOGANS[rank];
  return (
    <div className="flex items-center gap-3 py-3">
      <RankBadgeCircle rank={rank} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {slogan && (
          <p className="text-[13px] text-[#AAAAAA] font-pretendard leading-snug truncate">
            {slogan}
          </p>
        )}
        <p
          className={`font-noto leading-snug truncate flex items-center gap-1.5 ${
            isTop ? "text-[17px] font-bold text-[#222222]" : "text-[15px] font-medium text-[#666666]"
          }`}
        >
          {team.name}
          {isMyTeam && (
            <Image src="/assets/my_team.png" alt="내 팀" width={16} height={16} className="shrink-0" />
          )}
        </p>
        <p className="font-pretendard leading-snug">
          <span
            className={isTop ? "text-[15px] font-bold" : "text-[13px] font-medium"}
            style={{ color: "#13BD7F" }}
          >
            {team.score}점
          </span>
        </p>
      </div>
      <button
        onClick={onClickView}
        className="shrink-0 px-3 py-1.5 rounded-full text-[13px] font-pretendard font-medium text-[#666666] bg-[#F5F5F5]"
      >
        구경하기
      </button>
    </div>
  );
}

export default function ForestsRankingList({
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
      {header}
      <div className="flex flex-col divide-y divide-[#F0F0F0]">
        {teams.map((team, i) => (
          <TeamRankRow
            key={team.id}
            rank={i + 1}
            team={team}
            isMyTeam={team.id === myTeamId}
            onClickView={() => handleView(team)}
          />
        ))}
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
