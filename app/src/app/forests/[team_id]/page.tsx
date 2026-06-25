import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { THEMES } from "@/constants/themes";
import type { ThemeKey } from "@/constants/themes";
import ForestDetailStats from "./ForestDetailStats";

export default async function ForestDetailPage({
  params,
}: {
  params: Promise<{ team_id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const { team_id } = await params;
  const supabase = createSupabaseServerClient();

  type UserRow = { nickname: string; created_at: string; bible_progress: { count: number }[] };

  const [teamRes, usersRes, treesRes] = await Promise.all([
    supabase.from("teams").select("id, name, theme").eq("id", team_id).maybeSingle(),
    supabase.from("users").select("nickname, created_at, bible_progress(count)").eq("team_id", team_id),
    supabase.from("trees").select("species, x, y").eq("team_id", team_id).eq("is_planted", true),
  ]);

  if (!teamRes.data) redirect("/forests");

  const team = teamRes.data as { id: string; name: string; theme: string | null };
  const rawTheme = team.theme ?? "forest";
  const theme: ThemeKey = (["forest", "night", "ocean"] as const).includes(rawTheme as ThemeKey)
    ? (rawTheme as ThemeKey)
    : "forest";

  const users = (usersRes.data ?? []) as UserRow[];
  const score = users.reduce((sum, u) => sum + (u.bible_progress[0]?.count ?? 0), 0);
  const participants = users
    .map((u) => ({ nickname: u.nickname, score: u.bible_progress[0]?.count ?? 0, joinedAt: u.created_at }))
    .sort((a, b) => b.score - a.score);
  const plantedTrees = (treesRes.data ?? []) as { species: string; x: number; y: number }[];
  const treeCount = plantedTrees.length;

  const currentTheme = THEMES[theme];
  const isDarkBg = theme !== "forest";

  return (
    <div className="relative min-h-svh overflow-hidden">
      {/* 전체화면 배경 */}
      <div className="absolute inset-0">
        <img src={`/assets/${theme}/bg.png`} alt="" className="w-full h-full object-cover" />
      </div>

      {/* 배치된 아이템 레이어 */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        {plantedTrees.map((tree, i) => {
          const num = Number(tree.species);
          if (isNaN(num) || num <= 0) return null;
          return (
            <img
              key={i}
              src={`/assets/${theme}/${num}.png`}
              alt=""
              className="absolute w-12 h-12 object-contain"
              style={{ left: `${tree.x}%`, top: `${tree.y}%`, transform: "translate(-50%, -90%)" }}
            />
          );
        })}
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 flex flex-col min-h-svh">
        <div className="h-11" />

        {/* 숲 인터랙션 영역 */}
        <div className="flex-1 relative">
          <ForestDetailStats
            theme={theme}
            teamName={team.name}
            treeCount={treeCount}
            score={score}
            participants={participants}
          />
        </div>

        {/* 다른 숲 구경하러 가기 */}
        <div className="px-6 pb-safe pt-3">
          <Link
            href="/forests"
            transitionTypes={["nav-back"]}
            className={`press-fx w-full h-[48px] rounded-[8px] text-[16px] font-pretendard flex items-center justify-center ${
              isDarkBg
                ? "bg-white/15 text-white backdrop-blur-sm"
                : "bg-white/80 backdrop-blur-sm border border-white/60 text-[#222222]"
            }`}
          >
            {currentTheme.forumsLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
