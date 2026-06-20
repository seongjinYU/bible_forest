import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import PlaceTreeContent from "./PlaceTreeContent";

export default async function PlaceTreePage() {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const supabase = createSupabaseServerClient();
  const [teamRes, plantedRes] = await Promise.all([
    supabase.from("teams").select("name").eq("id", user.team_id).single(),
    supabase
      .from("trees")
      .select("species, x, y")
      .eq("team_id", user.team_id)
      .eq("is_planted", true),
  ]);

  const teamName = (teamRes.data as { name: string } | null)?.name ?? "";
  const plantedTrees = (plantedRes.data ?? []) as { species: string; x: number; y: number }[];

  return (
    <Suspense fallback={null}>
      <PlaceTreeContent
        plantedTrees={plantedTrees}
        previewName={user.nickname}
        previewTeam={teamName}
      />
    </Suspense>
  );
}
