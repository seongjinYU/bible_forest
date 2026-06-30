import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import ForestsCardGrid from "./ForestsCardGrid";
import ActivityTicker, { type Activity } from "./ActivityTicker";
import ForestsPullToRefresh from "./ForestsPullToRefresh";

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

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fetchedAtLabel = `${String(now.getFullYear()).slice(-2)}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

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

        {/* 스태거 카드 그리드 (헤더는 왼쪽 칼럼 상단에 포함) */}
        <ForestsCardGrid
          teams={sortedTeams}
          myTeamId={user.team_id}
          header={
            <div className="pb-2">
              <h1 className="text-[24px] font-bold font-noto leading-[32px] text-[#222222] whitespace-pre-line">
                {"현재 팀 순위를\n확인해 보세요!"}
              </h1>
              <p className="text-[14px] text-[#AAAAAA] font-pretendard mt-1">
                {fetchedAtLabel} 기준
              </p>
            </div>
          }
        />
      </ForestsPullToRefresh>

      {/* Floating 버튼 — absolute, 배경 컨테이너 없음 */}
      <Link
        href="/"
        transitionTypes={["nav-back"]}
        className="press-fx absolute left-5 right-5 h-[52px] rounded-full flex items-center justify-center text-white text-[16px] font-noto font-medium"
        style={{
          bottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
          background: "linear-gradient(90deg, #0FC8B8 0%, #13BD7F 100%)",
          boxShadow: "0 6px 24px rgba(49,198,120,0.45)",
        }}
      >
        우리 숲으로 돌아가기
      </Link>
    </div>
  );
}
