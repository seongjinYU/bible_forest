// ┌─────────────────────────────────────────────────────────────────┐
// │  GET /api/v1/bible/progress                                       │
// │  사용자의 신약 장별 체크 현황 + 요약을 조회한다. (읽기 전용)        │
// │  명세: docs/api-spec.md 1-1                                       │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { NT_BOOKS, TOTAL_NT_CHAPTERS } from "@/constants/bible";
import { pickRandomSpecies, SPECIAL_SPECIES, REWARD } from "@/constants/trees";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("bible_progress")
    .select("book_name, chapter")
    .eq("user_id", user.id)
    .order("book_name", { ascending: true })
    .order("chapter", { ascending: true });

  if (error) {
    return NextResponse.json({ message: "진행 현황을 불러오지 못했습니다." }, { status: 500 });
  }

  const checked = rows ?? [];
  const totalChapters = checked.length;
  const treesEarned = user.trees_earned;

  return NextResponse.json({
    checked,
    total_chapters: totalChapters,
    total_nt_chapters: TOTAL_NT_CHAPTERS,
    trees_earned: treesEarned,
    next_tree_remaining: (treesEarned + 1) * 10 - totalChapters,
    completed_one_bible: totalChapters >= TOTAL_NT_CHAPTERS,
    special_tree_earned: user.special_tree_earned,
  });
}

// ┌─────────────────────────────────────────────────────────────────┐
// │  PATCH /api/v1/bible/progress                                    │
// │  여러 장을 한 번에 읽기 완료/취소 + 나무 지급.                     │
// │  명세: docs/api-spec.md 1-2 (배치)                                │
// └─────────────────────────────────────────────────────────────────┘
//
// Request Body (배치):
//   { "checked": true, "chapters": [ { "book_name": "마태복음", "chapter": 1 }, ... ] }
// 단건도 허용(하위호환): { "book_name": "마태복음", "chapter": 1, "checked": true }
//
// 처리 위치: Supabase는 DB(테이블)로만 사용하고, 아래 로직(체크/해제·재계산·나무 지급)은
//           모두 이 백엔드 코드에서 수행한다. (DB 함수/RPC 미사용)

type ChapterItem = { book_name: string; chapter: number };
type EarnedTree = { tree_id: string; tree_type: string; species: string; points: number };

export async function PATCH(request: Request) {
  // 1) 로그인 확인
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) 본문 파싱
  let body: {
    checked?: unknown;
    chapters?: unknown;
    book_name?: unknown;
    chapter?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { checked } = body;
  if (typeof checked !== "boolean") {
    return NextResponse.json({ message: "올바르지 않은 요청입니다." }, { status: 400 });
  }

  // 3) 배치(chapters) 또는 단건(book_name/chapter) → 배열로 정규화
  let rawList: unknown;
  if (Array.isArray(body.chapters)) {
    rawList = body.chapters;
  } else if (body.book_name !== undefined) {
    rawList = [{ book_name: body.book_name, chapter: body.chapter }];
  } else {
    return NextResponse.json({ message: "체크할 장이 없습니다." }, { status: 400 });
  }

  const list = rawList as Array<{ book_name?: unknown; chapter?: unknown }>;
  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json({ message: "체크할 장이 없습니다." }, { status: 400 });
  }

  // 4) 각 항목 검증 (신약 책/장 범위) + 정제
  const items: ChapterItem[] = [];
  for (const it of list) {
    if (typeof it.book_name !== "string" || typeof it.chapter !== "number") {
      return NextResponse.json({ message: "올바르지 않은 요청입니다." }, { status: 400 });
    }
    const book = NT_BOOKS.find((b) => b.name === it.book_name);
    if (!book || !Number.isInteger(it.chapter) || it.chapter < 1 || it.chapter > book.chapters) {
      return NextResponse.json({ message: "올바르지 않은 책 또는 장입니다." }, { status: 400 });
    }
    items.push({ book_name: it.book_name, chapter: it.chapter });
  }

  const supabase = createSupabaseServerClient();

  // 5) 챌린지 기간 검증 (C1: 읽기 체크에만 적용)
  const today = new Date().toISOString().slice(0, 10);
  const { data: challenge } = await supabase
    .from("challenges")
    .select("id")
    .eq("is_active", true)
    .lte("start_date", today)
    .gte("end_date", today)
    .limit(1)
    .maybeSingle();
  if (!challenge) {
    return NextResponse.json({ message: "챌린지 기간이 아닙니다." }, { status: 403 });
  }

  // 6) 체크/해제 반영 (백엔드에서 직접)
  if (checked) {
    // 중복은 무시(멱등) — UNIQUE(user_id, book_name, chapter) 필요
    const rows = items.map((it) => ({
      user_id: user.id,
      book_name: it.book_name,
      chapter: it.chapter,
    }));
    const { error: wErr } = await supabase
      .from("bible_progress")
      .upsert(rows, { onConflict: "user_id,book_name,chapter", ignoreDuplicates: true });
    if (wErr) {
      return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
    }
  } else {
    const results = await Promise.all(
      items.map((it) =>
        supabase
          .from("bible_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("book_name", it.book_name)
          .eq("chapter", it.chapter),
      ),
    );
    if (results.some((r) => r.error)) {
      return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
    }
  }

  // 7) 총 장수 재계산
  const { count, error: cErr } = await supabase
    .from("bible_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (cErr) {
    return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
  const total = count ?? 0;

  // 8) 일반 나무 지급 — 단조 증가(A1). 배치 전체 반영 후 "한 번에" 정산
  let earned = user.trees_earned;
  let special = user.special_tree_earned;
  const newlyEarned: EarnedTree[] = [];

  const target = Math.floor(total / 10);
  if (target > earned) {
    const newRows = Array.from({ length: target - earned }, () => ({
      user_id: user.id,
      team_id: user.team_id,
      tree_type: "normal",
      species: pickRandomSpecies(),
      points: REWARD.NORMAL_TREE_POINTS,
    }));
    const { data: inserted, error: iErr } = await supabase
      .from("trees")
      .insert(newRows)
      .select("id, tree_type, species, points");
    if (iErr) {
      return NextResponse.json({ message: "나무 지급 중 오류가 발생했습니다." }, { status: 500 });
    }
    for (const t of inserted ?? []) {
      newlyEarned.push({ tree_id: t.id, tree_type: t.tree_type, species: t.species, points: t.points });
    }
    const { error: uErr } = await supabase
      .from("users")
      .update({ trees_earned: target })
      .eq("id", user.id);
    if (uErr) {
      return NextResponse.json({ message: "나무 지급 중 오류가 발생했습니다." }, { status: 500 });
    }
    earned = target;
  }

  // 9) 신약 1독(260장) 특별 나무 (A5)
  let specialNew = false;
  if (total >= TOTAL_NT_CHAPTERS && !special) {
    const { error: sErr } = await supabase.from("trees").insert({
      user_id: user.id,
      team_id: user.team_id,
      tree_type: "special",
      species: SPECIAL_SPECIES,
      points: REWARD.SPECIAL_TREE_POINTS,
    });
    if (sErr) {
      return NextResponse.json({ message: "나무 지급 중 오류가 발생했습니다." }, { status: 500 });
    }
    const { error: uErr } = await supabase
      .from("users")
      .update({ special_tree_earned: true })
      .eq("id", user.id);
    if (uErr) {
      return NextResponse.json({ message: "나무 지급 중 오류가 발생했습니다." }, { status: 500 });
    }
    special = true;
    specialNew = true;
  }

  // 10) 홈 페이지 캐시 무효화 (점수/나무 수 즉시 반영)
  revalidatePath("/");

  return NextResponse.json({
    total_chapters: total,
    total_nt_chapters: TOTAL_NT_CHAPTERS,
    trees_earned: earned,
    next_tree_remaining: (earned + 1) * 10 - total,
    completed_one_bible: total >= TOTAL_NT_CHAPTERS,
    special_tree_earned: special,
    special_tree_newly_earned: specialNew,
    newly_earned: newlyEarned,
  });
}
