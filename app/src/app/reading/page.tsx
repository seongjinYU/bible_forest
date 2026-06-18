import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import ReadingClient from "./ReadingClient";

export default async function ReadingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/register");

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("bible_progress")
    .select("book_name, chapter")
    .eq("user_id", user.id);

  const initialProgress = (data ?? []) as { book_name: string; chapter: number }[];

  return <ReadingClient initialProgress={initialProgress} />;
}
