import { redirect } from "next/navigation";
import MainScreen from "@/components/MainScreen";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { THEMES } from "@/constants/themes";
import type { ThemeKey } from "@/constants/themes";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const supabase = createSupabaseServerClient();

  const [teamRes, treesRes, memberRes] = await Promise.all([
    supabase.from("teams").select("name, theme").eq("id", user.team_id).single(),
    supabase.from("trees").select("points").eq("team_id", user.team_id),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("team_id", user.team_id),
  ]);

  const teamData = teamRes.data as { name: string; theme?: string | null } | null;
  const rawTheme = teamData?.theme;
  const theme: ThemeKey = rawTheme && rawTheme in THEMES ? (rawTheme as ThemeKey) : "tree";

  const trees = treesRes.data ?? [];
  const stats = {
    trees: trees.length,
    score: trees.reduce((sum, t) => sum + ((t as { points?: number }).points ?? 0), 0),
    participants: memberRes.count ?? 0,
  };

  return (
    <MainScreen
      name={user.nickname}
      team={teamData?.name ?? ""}
      theme={theme}
      stats={stats}
    />
  );
}
