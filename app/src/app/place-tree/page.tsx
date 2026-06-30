import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import PlaceTreeContent from "./PlaceTreeContent";

export default async function PlaceTreePage() {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const supabase = createSupabaseServerClient();
  const [teamRes, usersRes, plantedRes, storageRes, myProgressRes, lastReadRes] = await Promise.all([
    supabase.from("teams").select("name").eq("id", user.team_id).single(),
    supabase.from("users").select("nickname, created_at, bible_progress(count)").eq("team_id", user.team_id),
    supabase
      .from("trees")
      .select("species, x, y")
      .eq("team_id", user.team_id)
      .eq("is_planted", true),
    supabase
      .from("trees")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_planted", false),
    supabase
      .from("bible_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("bible_progress")
      .select("checked_at")
      .eq("user_id", user.id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const teamName = (teamRes.data as { name: string } | null)?.name ?? "";
  const plantedTrees = (plantedRes.data ?? []) as { species: string; x: number; y: number }[];
  const storageCount = storageRes.count ?? 0;
  const totalChapters = myProgressRes.count ?? 0;
  const lastReadAt = (lastReadRes.data as { checked_at: string } | null)?.checked_at ?? null;

  type UserRow = { nickname: string; created_at: string; bible_progress: { count: number }[] };
  const usersData = (usersRes.data ?? []) as UserRow[];
  const stats = {
    trees: plantedTrees.length,
    score: usersData.reduce((sum, u) => sum + (u.bible_progress[0]?.count ?? 0), 0),
    participants: usersData.length,
  };
  const participants = usersData
    .map((u) => ({ nickname: u.nickname, score: u.bible_progress[0]?.count ?? 0, joinedAt: u.created_at }))
    .sort((a, b) => b.score - a.score);

  return (
    <Suspense fallback={null}>
      <PlaceTreeContent
        plantedTrees={plantedTrees}
        previewName={user.nickname}
        previewTeam={teamName}
        stats={stats}
        storageCount={storageCount}
        totalChapters={totalChapters}
        lastReadAt={lastReadAt}
        participants={participants}
      />
    </Suspense>
  );
}
