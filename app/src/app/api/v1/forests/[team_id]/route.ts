// ┌─────────────────────────────────────────────────────────────────┐
// │  GET /api/v1/forests/:team_id                                    │
// │  팀 숲 화면용. 팀 요약 + 배치된 나무 목록(좌표 포함)을 한 번에(B2). │
// │  기간 제약 없음.  명세: docs/api-spec.md 3-1                       │
// └─────────────────────────────────────────────────────────────────┘
//
// 동적 경로: 폴더 이름이 [team_id] 이면, URL의 그 자리 값이 params.team_id 로 들어온다.
//   /api/v1/forests/abc-123  →  params.team_id === "abc-123"

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ team_id: string }> },
) {
  // ── 1) 로그인 확인 ──
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  // Next.js 16에서 params는 비동기 → await 필요
  const { team_id } = await params;

  const supabase = createSupabaseServerClient();

  // ── 2) 팀 존재 확인 ──
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", team_id)
    .maybeSingle();

  if (teamErr) {
    return NextResponse.json({ message: "팀 숲을 불러오지 못했습니다." }, { status: 500 });
  }
  if (!team) {
    return NextResponse.json({ message: "팀을 찾을 수 없습니다." }, { status: 404 });
  }

  // ── 3) 팀 요약 통계 + 배치된 나무 목록을 한 번에 조회 (병렬) ──
  const [membersRes, allTreesRes, plantedRes] = await Promise.all([
    // 참여 인원 수
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("team_id", team_id),
    // 팀이 보유한 전체 나무(점수 합산·개수용) — B4: points 합이 랭킹 점수
    supabase
      .from("trees")
      .select("points")
      .eq("team_id", team_id),
    // 숲에 그릴 "배치된" 나무만 + 심은 사람 닉네임(users 조인). z_index 오름차순(뒤→앞 렌더)
    supabase
      .from("trees")
      .select("id, species, tree_type, x, y, z_index, users(nickname)")
      .eq("team_id", team_id)
      .eq("is_planted", true)
      .order("z_index", { ascending: true, nullsFirst: true }),
  ]);

  if (membersRes.error || allTreesRes.error || plantedRes.error) {
    return NextResponse.json({ message: "팀 숲을 불러오지 못했습니다." }, { status: 500 });
  }

  const memberCount = membersRes.count ?? 0;
  const allTrees = allTreesRes.data ?? [];
  const treeCount = allTrees.length;                                  // 팀 보유 나무 수
  const totalScore = allTrees.reduce((s, t) => s + (t.points ?? 0), 0); // 점수 합(B4)

  // 조인된 users는 버전에 따라 객체/배열로 올 수 있어 둘 다 대응
  const trees = (plantedRes.data ?? []).map((t) => {
    const u = Array.isArray(t.users) ? t.users[0] : t.users;
    return {
      tree_id: t.id,
      species: t.species,
      tree_type: t.tree_type,
      x: t.x,
      y: t.y,
      z_index: t.z_index,
      nickname: u?.nickname ?? null,
    };
  });

  // ── 4) 명세(3-1) 모양으로 응답 ──
  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      member_count: memberCount,
      tree_count: treeCount,
      total_score: totalScore,
    },
    trees,
  });
}
