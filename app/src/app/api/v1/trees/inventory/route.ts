// ┌─────────────────────────────────────────────────────────────────┐
// │  GET /api/v1/trees/inventory                                     │
// │  획득했지만 아직 배치하지 않은 나무 목록(is_planted=false) 조회.    │
// │  명세: docs/api-spec.md 2-1                                       │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

// 콜드스타트 완화: 읽기 전용 라우트 → Edge 전환.
export const runtime = "edge";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trees")
    .select("id, tree_type, species, points, obtained_at")
    .eq("user_id", user.id)      // 본인 것만
    .eq("is_planted", false)     // 아직 안 심은 것만
    .order("obtained_at", { ascending: true });

  if (error) {
    return NextResponse.json({ message: "나무 목록을 불러오지 못했습니다." }, { status: 500 });
  }

  // DB의 컬럼명 id → 명세상 키 tree_id 로 바꿔서 내려준다.
  const trees = (data ?? []).map((t) => ({
    tree_id: t.id,
    tree_type: t.tree_type,
    species: t.species,
    points: t.points,
    obtained_at: t.obtained_at,
  }));

  return NextResponse.json({ trees });
}
