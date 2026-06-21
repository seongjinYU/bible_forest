// ┌─────────────────────────────────────────────────────────────────┐
// │  POST /api/v1/trees/place                                        │
// │  획득한 나무를 숲에 배치(좌표 저장). 1회성·이후 수정/취소 불가(B3). │
// │  명세: docs/api-spec.md 2-2                                       │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  // ── 1) 로그인 확인 ──
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  // ── 2) 본문 파싱 + 검증 ──
  let body: { tree_id?: unknown; x?: unknown; y?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { tree_id, x, y } = body;

  if (typeof tree_id !== "string" || typeof x !== "number" || typeof y !== "number") {
    return NextResponse.json({ message: "올바르지 않은 요청입니다." }, { status: 400 });
  }
  if (x < 0 || x > 100 || y < 0 || y > 100) {
    return NextResponse.json({ message: "좌표 범위를 벗어났습니다." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // ── 3) 대상 나무 조회 + 권한/상태 검증 ──
  const { data: tree, error: findErr } = await supabase
    .from("trees")
    .select("id, user_id, is_planted")
    .eq("id", tree_id)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
  if (!tree) {
    return NextResponse.json({ message: "나무를 찾을 수 없습니다." }, { status: 404 });
  }
  if (tree.user_id !== user.id) {
    // RLS를 우회 중이라 소유권은 코드가 직접 검사(결정 C2).
    return NextResponse.json({ message: "본인 소유의 나무가 아닙니다." }, { status: 403 });
  }
  if (tree.is_planted) {
    return NextResponse.json({ message: "이미 배치된 나무입니다." }, { status: 400 });
  }

  // ── 4) 배치 시점에 z_index 부여 (DB 시퀀스 nextval — 순차 증가, 렌더 순서) ──
  const { data: z, error: zErr } = await supabase.rpc("next_tree_z");
  if (zErr) {
    return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  // ── 5) 배치 (is_planted=false 조건을 한 번 더 걸어 동시 요청 방어) ──
  const { data: updated, error: upErr } = await supabase
    .from("trees")
    .update({ is_planted: true, x, y, z_index: z, planted_at: new Date().toISOString() })
    .eq("id", tree_id)
    .eq("is_planted", false)
    .select("id, tree_type, species, x, y, z_index, planted_at")
    .single();

  if (upErr || !updated) {
    return NextResponse.json({ message: "이미 배치된 나무입니다." }, { status: 400 });
  }

  // ── 5) 201 Created ──
  return NextResponse.json(
    {
      tree: {
        tree_id: updated.id,
        tree_type: updated.tree_type,
        species: updated.species,
        x: updated.x,
        y: updated.y,
        z_index: updated.z_index,
        planted_at: updated.planted_at,
      },
    },
    { status: 201 },
  );
}
