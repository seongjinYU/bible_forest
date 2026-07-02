import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { THEMES } from "@/constants/themes";
import type { ThemeKey } from "@/constants/themes";
import ForestBackground from "@/components/forest/ForestBackground";
import ForestStatsCard from "@/components/forest/ForestStatsCard";
import ForumsCta from "@/components/forest/ForumsCta";

const SUBJECT_PARTICLE: Record<ThemeKey, string> = {
  forest: "은",
  night: "은",
  ocean: "는",
};

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

  const particle = SUBJECT_PARTICLE[theme];

  return (
    <div className="relative min-h-svh overflow-hidden">
      <ForestBackground theme={theme} plantedTrees={plantedTrees} />

      {/* 콘텐츠 */}
      <div className="relative z-10 flex flex-col min-h-svh">
        <div className="h-11" />

        {/* 숲 인터랙션 영역 */}
        <div className="flex-1 relative">
          <ForestStatsCard
            theme={theme}
            statPhrase={`현재 ${team.name}의 ${THEMES[theme].label}${particle}?`}
            treeCount={treeCount}
            score={score}
            participants={participants}
            teamId={team.id}
          />
        </div>

        <ForumsCta theme={theme} className="px-6 pt-3" />
      </div>
    </div>
  );
}
