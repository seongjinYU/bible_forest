import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const supabase = createSupabaseServerClient();

  // 유저별 최신 bible_progress 1건씩 가져오기
  // users → bible_progress (checked_at DESC limit 1) join
  const { data } = await supabase
    .from("users")
    .select("nickname, teams(name), bible_progress(book_name, chapter, checked_at)")
    .order("checked_at", { referencedTable: "bible_progress", ascending: false });

  type RawRow = {
    nickname: string;
    teams: { name: string } | { name: string }[] | null;
    bible_progress: { book_name: string; chapter: number; checked_at: string }[];
  };

  const activities = (data ?? [])
    .map((row) => {
      const r = row as unknown as RawRow;
      const teamName = Array.isArray(r.teams)
        ? (r.teams[0]?.name ?? "")
        : (r.teams?.name ?? "");
      const latest = r.bible_progress[0];
      if (!latest || !r.nickname) return null;
      return {
        book_name: latest.book_name,
        chapter: latest.chapter,
        nickname: r.nickname,
        team_name: teamName,
      };
    })
    .filter(Boolean) as { book_name: string; chapter: number; nickname: string; team_name: string }[];

  // Fisher-Yates 셔플 후 5건
  for (let i = activities.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activities[i], activities[j]] = [activities[j], activities[i]];
  }

  return NextResponse.json(activities.slice(0, 5));
}
