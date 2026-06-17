import { redirect } from "next/navigation";
import MainScreen from "@/components/MainScreen";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const supabase = createSupabaseServerClient();

  const [teamRes, usersRes] = await Promise.all([
    supabase.from("teams").select("name").eq("id", user.team_id).single(),
    supabase.from("users").select("trees(points), bible_progress(count)").eq("team_id", user.team_id),
  ]);

  const teamData = teamRes.data as { name: string } | null;

  type UserRow = { trees: { points: number }[]; bible_progress: { count: number }[] };
  const usersData = (usersRes.data ?? []) as UserRow[];

  const stats = {
    trees: usersData.flatMap((u) => u.trees).length,
    score: usersData.reduce((sum, u) => sum + (u.bible_progress[0]?.count ?? 0), 0),
    participants: usersData.length,
  };

  return (
    <MainScreen
      name={user.nickname}
      team={teamData?.name ?? ""}
      stats={stats}
    />
  );
}
