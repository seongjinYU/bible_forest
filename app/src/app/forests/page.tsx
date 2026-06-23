import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import ForestsCardGrid from "./ForestsCardGrid";
import ActivityTicker, { type Activity } from "./ActivityTicker";
import ForestsPullToRefresh from "./ForestsPullToRefresh";

type TeamColor = { primary: string; illus: string; border: string };

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

type PlantedTree = { species: string; x: number; y: number };
type TeamStat = { id: string; name: string; score: number; tree_count: number; theme: string | null; plantedTrees: PlantedTree[] };

function toSingle<T>(val: T | T[] | null | undefined): T | null {
  if (val === null || val === undefined) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

export default async function ForestsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const supabase = createSupabaseServerClient();

  type UserRow = { team_id: string; bible_progress: { count: number }[] };

  const [teamsRes, treesRes, usersRes, activityRes] = await Promise.all([
    supabase.from("teams").select("id, name, theme"),
    supabase.from("trees").select("team_id, species, x, y").eq("is_planted", true),
    supabase.from("users").select("team_id, bible_progress(count)"),
    supabase
      .from("users")
      .select("nickname, teams(name), bible_progress(book_name, chapter, checked_at)")
      .order("checked_at", { referencedTable: "bible_progress", ascending: false }),
  ]);

  // theme 컬럼이 DB에 없으면 error가 오므로 fallback
  type TeamRow = { id: string; name: string; theme: string | null };
  let allTeams: TeamRow[] = [];
  if (teamsRes.error) {
    const fallback = await supabase.from("teams").select("id, name");
    allTeams = (fallback.data ?? []).map((t) => ({ ...(t as { id: string; name: string }), theme: null }));
  } else {
    allTeams = (teamsRes.data ?? []) as TeamRow[];
  }
  const allTrees = (treesRes.data ?? []) as { team_id: string; species: string; x: number; y: number }[];
  const allUsers = (usersRes.data ?? []) as UserRow[];

  // 유저별 최신 bible_progress 1건씩 파싱
  type RawActivityRow = {
    nickname: string;
    teams: { name: string } | { name: string }[] | null;
    bible_progress: { book_name: string; chapter: number; checked_at: string }[];
  };
  const rawActivities = (activityRes.data ?? []) as unknown as RawActivityRow[];
  const initialActivities: Activity[] = rawActivities
    .map((row) => {
      const teamName = Array.isArray(row.teams)
        ? (row.teams[0]?.name ?? "")
        : (row.teams?.name ?? "");
      const latest = row.bible_progress[0];
      if (!latest || !row.nickname) return null;
      return {
        book_name: latest.book_name,
        chapter: latest.chapter,
        nickname: row.nickname,
        team_name: teamName,
      };
    })
    .filter(Boolean) as Activity[];

  // Fisher-Yates 셔플 후 5건
  for (let i = initialActivities.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [initialActivities[i], initialActivities[j]] = [initialActivities[j], initialActivities[i]];
  }
  const shuffledActivities = initialActivities.slice(0, 5);

  // 팀 통계 계산
  const teamStats: TeamStat[] = allTeams.map((team) => {
    const teamUsers = allUsers.filter((u) => u.team_id === team.id);
    const score = teamUsers.reduce((sum, u) => sum + (u.bible_progress[0]?.count ?? 0), 0);
    const teamTrees = allTrees.filter((t) => t.team_id === team.id);
    const tree_count = teamTrees.length;
    const plantedTrees = teamTrees.map(({ species, x, y }) => ({ species, x, y }));
    return { id: team.id, name: team.name, score, tree_count, theme: team.theme ?? null, plantedTrees };
  });

  const topTeam = [...teamStats].sort((a, b) => b.score - a.score)[0] ?? null;
  const topColor = topTeam ? (TEAM_COLORS[topTeam.name] ?? DEFAULT_COLOR) : DEFAULT_COLOR;

  const myTeamStat = teamStats.find((t) => t.id === user.team_id);
  const others = teamStats
    .filter((t) => t.id !== user.team_id)
    .sort((a, b) => b.score - a.score);
  const sortedTeams = myTeamStat ? [myTeamStat, ...others] : others;

  return (
    <div className="relative flex flex-col h-dvh bg-white">
      {/* 스크롤 영역 — 헤더 + 카드 모두 포함 */}
      <ForestsPullToRefresh>
        {/* 최근 활동 배너 */}
        {shuffledActivities.length > 0 && (
          <ActivityTicker initial={shuffledActivities} />
        )}

        {/* 1위 팀 */}
        {topTeam && (
          <div className="pb-5">
            <p className="text-[13px] text-[#BBBBBB] font-pretendard mb-0.5">
              가장 많은 성경을 읽은 팀은
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className="text-[32px] font-bold font-noto leading-none"
                style={{ color: topColor.primary }}
              >
                {topTeam.name}
              </span>
              <span className="text-[16px] text-[#BBBBBB] font-pretendard">
                {topTeam.score}점
              </span>
            </div>
          </div>
        )}

        {/* 스태거 카드 그리드 */}
        <ForestsCardGrid teams={sortedTeams} myTeamId={user.team_id} />
      </ForestsPullToRefresh>

      {/* Floating 버튼 — absolute, 배경 컨테이너 없음 */}
      <Link
        href="/"
        transitionTypes={["nav-back"]}
        className="press-fx absolute left-5 right-5 h-[52px] rounded-full flex items-center justify-center text-white text-[16px] font-noto font-medium"
        style={{
          bottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
          background: "#31C678",
          boxShadow: "0 6px 24px rgba(49,198,120,0.45)",
        }}
      >
        우리 숲으로 돌아가기
      </Link>
    </div>
  );
}
