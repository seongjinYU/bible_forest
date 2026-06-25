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

  const [teamRes, usersRes, plantedRes, storageRes, myProgressRes] = await Promise.all([
    supabase.from("teams").select("name").eq("id", user.team_id).single(),
    supabase.from("users").select("nickname, created_at, bible_progress(count)").eq("team_id", user.team_id),
    supabase
      .from("trees")
      .select("species, x, y")
      .eq("team_id", user.team_id)
      .eq("is_planted", true),
    // 보관중(아직 배치 안 한) 아이템 개수 — 본인 것만
    supabase
      .from("trees")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_planted", false),
    // 내가 읽은 총 장수
    supabase
      .from("bible_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const teamData = teamRes.data as { name: string } | null;
  const storageCount = storageRes.count ?? 0;
  const totalChapters = myProgressRes.count ?? 0;

  type UserRow = { nickname: string; created_at: string; bible_progress: { count: number }[] };
  const usersData = (usersRes.data ?? []) as UserRow[];
  const plantedTrees = (plantedRes.data ?? []) as { species: string; x: number; y: number }[];

  const stats = {
    trees: plantedTrees.length,
    score: usersData.reduce((sum, u) => sum + (u.bible_progress[0]?.count ?? 0), 0),
    participants: usersData.length,
  };
  const participants = usersData
    .map((u) => ({ nickname: u.nickname, score: u.bible_progress[0]?.count ?? 0, joinedAt: u.created_at }))
    .sort((a, b) => b.score - a.score);

  return (
    <MainScreen
      name={user.nickname}
      team={teamData?.name ?? ""}
      stats={stats}
      plantedTrees={plantedTrees}
      storageCount={storageCount}
      totalChapters={totalChapters}
      participants={participants}
    />
  );
}
