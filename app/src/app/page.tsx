import { redirect } from "next/navigation";
import MainScreen from "@/components/MainScreen";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

// 콜드스타트 완화: 엔트리 SSR을 Edge로. (리전 미지정 = 사용자 근처 자동 실행)
export const runtime = "edge";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const supabase = createSupabaseServerClient();

  const [teamRes, usersRes, plantedRes] = await Promise.all([
    supabase.from("teams").select("name").eq("id", user.team_id).single(),
    supabase.from("users").select("trees(points), bible_progress(count)").eq("team_id", user.team_id),
    supabase
      .from("trees")
      .select("species, x, y")
      .eq("team_id", user.team_id)
      .eq("is_planted", true),
  ]);

  const teamData = teamRes.data as { name: string } | null;

  type UserRow = { trees: { points: number }[]; bible_progress: { count: number }[] };
  const usersData = (usersRes.data ?? []) as UserRow[];

  const stats = {
    trees: usersData.flatMap((u) => u.trees).length,
    score: usersData.reduce((sum, u) => sum + (u.bible_progress[0]?.count ?? 0), 0),
    participants: usersData.length,
  };

  const plantedTrees = (plantedRes.data ?? []) as { species: string; x: number; y: number }[];

  return (
    <MainScreen
      name={user.nickname}
      team={teamData?.name ?? ""}
      stats={stats}
      plantedTrees={plantedTrees}
    />
  );
}
