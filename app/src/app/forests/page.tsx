import { redirect } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import ForestsRankingList from "./ForestsRankingList";
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

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fetchedAtLabel = `${String(now.getUTCFullYear()).slice(-2)}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;

  const sortedTeams = [...teamStats].sort((a, b) => b.score - a.score);

  return (
    <div className="relative flex flex-col h-dvh bg-white">
      {/* AppBar */}
      <div
        className="flex items-center px-4 pt-[22px] shrink-0 relative"
        style={{ paddingTop: "max(22px, env(safe-area-inset-top))" }}
      >
        <h1 className="flex-1 text-center text-[17px] font-semibold font-pretendard text-[#222222]">
          다른 팀 구경하러 가기
        </h1>
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="absolute right-4 w-[24px] h-[24px] flex items-center justify-center"
          style={{ top: "max(18px, env(safe-area-inset-top))" }}
          aria-label="닫기"
        >
          <X size={24} className="text-[#222222]" />
        </Link>
      </div>

      {/* 스크롤 영역 */}
      <ForestsPullToRefresh>
        <div key="activity-ticker">
          {shuffledActivities.length > 0 && (
            <ActivityTicker initial={shuffledActivities} />
          )}
        </div>

        <ForestsRankingList
          key="ranking-list"
          teams={sortedTeams}
          myTeamId={user.team_id}
          header={
            <div className="pb-2">
              <h2
                className="font-pretendard text-[#222222] whitespace-nowrap"
                style={{ fontWeight: 600, fontSize: 24, lineHeight: "130%", letterSpacing: "-0.025em" }}
              >
                현재 팀 순위를 확인해 보세요!
              </h2>
              <p
                className="font-pretendard mt-1"
                style={{ fontWeight: 300, fontSize: 16, lineHeight: "150%", letterSpacing: "-0.025em", color: "#13BD7F" }}
              >
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
        className="press-fx absolute left-6 right-6 h-12 rounded-[8px] flex items-center justify-center text-white text-[16px] font-noto font-medium"
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
