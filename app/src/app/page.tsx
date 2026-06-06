import { redirect } from "next/navigation";
import MainScreen from "@/components/MainScreen";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const supabase = createSupabaseServerClient();
  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("id", user.team_id)
    .single();

  return <MainScreen name={user.nickname} team={team?.name ?? ""} />;
}
