"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeamColor = { primary: string; illus: string; border: string };
type TeamStat = { id: string; name: string; score: number; tree_count: number; theme: string | null };

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

function TreeThumbnail() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #C8ECFF 0%, #A8D870 55%, #5CBD50 100%)" }}
    >
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 200 90"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
      >
        <path d="M0 90 L0 55 Q30 35 65 45 Q100 55 135 32 Q165 18 200 38 L200 90 Z" fill="#6BC46B" />
        <path d="M0 90 L0 68 Q28 52 57 60 Q90 70 125 52 Q155 38 200 56 L200 90 Z" fill="#3DB340" />
        <circle cx="45"  cy="43" r="7" fill="#228B22" />
        <circle cx="100" cy="30" r="6" fill="#228B22" />
        <circle cx="158" cy="36" r="6" fill="#228B22" />
        <circle cx="30"  cy="59" r="8" fill="#1E7A1E" />
        <circle cx="80"  cy="51" r="8" fill="#1E7A1E" />
        <circle cx="148" cy="53" r="7" fill="#1E7A1E" />
      </svg>
    </div>
  );
}

function StarThumbnail() {
  const dots = [
    { x: "10%", y: "15%" }, { x: "70%", y: "10%" }, { x: "85%", y: "28%" },
    { x: "30%", y: "30%" }, { x: "55%", y: "18%" }, { x: "45%", y: "58%" },
    { x: "80%", y: "48%" }, { x: "15%", y: "62%" }, { x: "60%", y: "72%" },
    { x: "92%", y: "20%" }, { x: "25%", y: "50%" },
  ];
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #2D0566 0%, #7B3FC8 100%)" }}
    >
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: d.x,
            top: d.y,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            opacity: 0.65 + (i % 3) * 0.1,
          }}
        />
      ))}
      <div
        className="absolute rounded-full"
        style={{
          width: 38,
          height: 38,
          left: "62%",
          top: "38%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle at 35% 35%, #E0B0FF, #8040C0)",
          boxShadow: "0 0 14px 4px rgba(180,100,255,0.4)",
        }}
      />
      <div
        className="absolute rounded-full bg-white"
        style={{
          width: 22,
          height: 22,
          left: "22%",
          top: "26%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 10px 3px rgba(255,255,255,0.45)",
        }}
      />
    </div>
  );
}

function ThemeThumbnail({ theme }: { theme: string }) {
  if (theme === "tree")  return <TreeThumbnail />;
  if (theme === "star")  return <StarThumbnail />;
  return null;
}

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
        {(team.theme || team.score > 0 || team.tree_count > 0) && (
          <ThemeThumbnail theme={team.theme ?? "tree"} />
        )}
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
      router.push("/");
    } else if (!team.theme && team.score === 0 && team.tree_count === 0) {
      setShowNoThemePopup(true);
    } else {
      router.push(`/forests/${team.id}`);
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
