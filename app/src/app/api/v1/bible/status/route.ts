// ┌─────────────────────────────────────────────────────────────────┐
// │  GET /api/v1/bible/status                                        │
// │  누적 장수 / 다음 나무까지 남은 장수 등 "요약만" 경량 조회.        │
// │  명세: docs/api-spec.md 1-3                                       │
// └─────────────────────────────────────────────────────────────────┘
//
// 1-1(progress)과 거의 같지만 checked 배열을 빼고 요약 숫자만 돌려준다.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { TOTAL_NT_CHAPTERS } from "@/constants/bible";

// 콜드스타트 완화: 홈 화면이 매번 호출하는 경량 읽기 전용 라우트 → Edge 전환.
export const runtime = "edge";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  // 체크한 장의 "개수"만 필요 → head:true + count 로 행을 안 가져오고 숫자만 셈(가볍다).
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("bible_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ message: "현황을 불러오지 못했습니다." }, { status: 500 });
  }

  const totalChapters = count ?? 0;
  const treesEarned = user.trees_earned;

  return NextResponse.json({
    total_chapters: totalChapters,
    total_nt_chapters: TOTAL_NT_CHAPTERS,
    trees_earned: treesEarned,
    next_tree_remaining: (treesEarned + 1) * 10 - totalChapters,
    completed_one_bible: totalChapters >= TOTAL_NT_CHAPTERS,
    special_tree_earned: user.special_tree_earned,
  });
}
