import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import ForestsCardGrid from "./ForestsCardGrid";

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
      .from("bible_progress")
      .select("book_name, chapter, users(nickname, teams(name))")
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  // 최근 활동 파싱 (users join은 객체/배열 양쪽 대응)
  const rawActivity = activityRes.data as {
    book_name: string;
    chapter: number;
    users:
      | { nickname: string; teams: { name: string } | { name: string }[] | null }
      | { nickname: string; teams: { name: string } | { name: string }[] | null }[]
      | null;
  } | null;

  const activityUserObj = rawActivity ? toSingle(rawActivity.users) : null;
  const activityTeamObj = activityUserObj ? toSingle(activityUserObj.teams) : null;
  const activityNickname = activityUserObj?.nickname ?? "";
  const activityTeamName = activityTeamObj?.name ?? "";

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

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fetchedAtLabel = `${String(now.getUTCFullYear()).slice(-2)}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;

  const myTeamStat = teamStats.find((t) => t.id === user.team_id);
  const others = teamStats
    .filter((t) => t.id !== user.team_id)
    .sort((a, b) => b.score - a.score);
  const sortedTeams = myTeamStat ? [myTeamStat, ...others] : others;

  return (
    <div className="relative flex flex-col h-dvh bg-white">
      {/* 스크롤 영역 — 헤더 + 카드 모두 포함 */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-20"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >

        {/* 최근 활동 배너 */}
        {rawActivity && activityNickname && (
          <div className="mb-4">
            <div className="rounded-[14px] bg-[#111111] px-4 py-3.5 flex items-center gap-2.5">
              <span className="text-[18px] shrink-0">🍀</span>
              <p className="text-[13px] font-pretendard leading-snug">
                <span className="text-white/70">
                  {activityTeamName} {activityNickname}님{" "}
                </span>
                <span className="text-white font-bold">
                  {rawActivity.book_name} {rawActivity.chapter}장
                </span>
                <span className="text-white/70"> 인증 완료!</span>
              </p>
            </div>
          </div>
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
      </div>{/* /스크롤 영역 */}

      {/* Floating 버튼 — absolute, 배경 컨테이너 없음 */}
      <Link
        href="/"
        className="absolute left-5 right-5 h-[52px] rounded-full flex items-center justify-center text-white text-[16px] font-noto font-medium"
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
