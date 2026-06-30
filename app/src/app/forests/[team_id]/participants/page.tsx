import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import ParticipantsList from "./ParticipantsList";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ team_id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const { team_id } = await params;
  const supabase = createSupabaseServerClient();

  type UserRow = { nickname: string; created_at: string; bible_progress: { count: number }[] };

  const [teamRes, usersRes] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", team_id).maybeSingle(),
    supabase.from("users").select("nickname, created_at, bible_progress(count)").eq("team_id", team_id),
  ]);

  if (!teamRes.data) redirect("/forests");

  const team = teamRes.data as { id: string; name: string };
  const users = (usersRes.data ?? []) as UserRow[];
  const participants = users
    .map((u) => ({ nickname: u.nickname, score: u.bible_progress[0]?.count ?? 0, joinedAt: u.created_at }))
    .sort((a, b) => b.score - a.score);

  return <ParticipantsList teamName={team.name} participants={participants} />;
}
