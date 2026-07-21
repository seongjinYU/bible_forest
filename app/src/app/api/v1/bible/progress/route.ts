// ┌─────────────────────────────────────────────────────────────────┐
// │  GET /api/v1/bible/progress                                       │
// │  사용자의 신약 장별 체크 현황 + 요약을 조회한다. (읽기 전용)        │
// │  명세: docs/api-spec.md 1-1                                       │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { TOTAL_NT_CHAPTERS } from "@/constants/bible";
import { pickRandomSpecies, REWARD } from "@/constants/trees";
import { THEMES } from "@/constants/themes";
import type { ThemeKey } from "@/constants/themes";
import {
  normalizeBooksInput,
  validateAndDedupeBooks,
  computeNormalTreeTarget,
  computeNextTreeRemaining,
  isBibleCompleted,
  resolveBibleCompletionFlag,
} from "@/lib/bible-progress";

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
    next_tree_remaining: computeNextTreeRemaining(treesEarned, totalChapters),
    completed_one_bible: isBibleCompleted(totalChapters),
    special_tree_earned: user.special_tree_earned,
  });
}

// ┌─────────────────────────────────────────────────────────────────┐
// │  PATCH /api/v1/bible/progress                                    │
// │  여러 권(book)을 한 번에 bulk replace. 각 권의 체크 목록을 통째 교체.│
// │  나무 지급/회수는 전체 반영 후 "마지막에 한 번만" 정산.            │
// │  명세: docs/api-spec.md 1-2                                       │
// └─────────────────────────────────────────────────────────────────┘
//
// Request Body — 다권:
//   { "books": [ { "book_name": "마태복음", "chapters": [3] },
//                { "book_name": "마가복음", "chapters": [1,2,3,4,5] } ] }
// 단권(하위호환):
//   { "book_name": "마태복음", "chapters": [1,2,3] }
//   - chapters = 그 권의 "현재 체크된 장 전체 목록" (빈 배열이면 그 권 전체 해제)

type EarnedTree = { tree_id: string; tree_type: string; species: string; points: number };

export async function PATCH(request: Request) {
  // 1) 로그인 확인
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) 본문 파싱
  let body: { books?: unknown; book_name?: unknown; chapters?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  // 3) 다권/단권 → 배열로 정규화
  const rawBooks = normalizeBooksInput(body);
  if (rawBooks === null) {
    return NextResponse.json({ message: "올바르지 않은 요청입니다." }, { status: 400 });
  }

  // 4) 검증 + 권별 dedupe (같은 권 중복 시 마지막 것 사용)
  const validated = validateAndDedupeBooks(rawBooks);
  if (!validated.ok) {
    const message =
      validated.reason === "no_books"
        ? "체크할 권이 없습니다."
        : validated.reason === "invalid_shape"
          ? "올바르지 않은 요청입니다."
          : "올바르지 않은 책 또는 장입니다.";
    return NextResponse.json({ message }, { status: 400 });
  }
  const bookMap = validated.books;

  const supabase = createSupabaseServerClient();

  // 5) 챌린지 기간 검증(C1) + 팀 테마 조회를 병렬로 — 서로 의존관계 없음
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [{ data: challenge }, { data: teamData }] = await Promise.all([
    supabase
      .from("challenges")
      .select("id")
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(1)
      .maybeSingle(),
    supabase.from("teams").select("theme").eq("id", user.team_id).single(),
  ]);
  if (!challenge) {
    return NextResponse.json({ message: "챌린지 기간이 아닙니다." }, { status: 403 });
  }
  const rawTheme = (teamData as { theme?: string | null } | null)?.theme;
  const theme: ThemeKey = rawTheme && rawTheme in THEMES ? (rawTheme as ThemeKey) : "forest";

  // 6) 권별 bulk replace: 변경된 권 전체를 단일 DELETE → 일괄 INSERT
  const bookNames = [...bookMap.keys()];
  const { error: delErr } = await supabase
    .from("bible_progress")
    .delete()
    .eq("user_id", user.id)
    .in("book_name", bookNames);
  if (delErr) {
    return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
  const insertRows: { user_id: string; book_name: string; chapter: number }[] = [];
  for (const [bookName, chs] of bookMap) {
    for (const c of chs) insertRows.push({ user_id: user.id, book_name: bookName, chapter: c });
  }
  if (insertRows.length > 0) {
    const { error: insErr } = await supabase.from("bible_progress").insert(insertRows);
    if (insErr) {
      return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
    }
  }

  // 7) 총 장수 재계산 (전체 반영 후 한 번)
  const { count, error: cErr } = await supabase
    .from("bible_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (cErr) {
    return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
  const total = count ?? 0;

  let earned = user.trees_earned;
  let special = user.special_tree_earned;
  const newlyEarned: EarnedTree[] = [];
  let reclaimed = 0;

  // 8) 일반 나무 — 기준(floor(total/10))에 맞춰 지급 또는 회수 (한 번만)
  const target = computeNormalTreeTarget(total);
  if (target > earned) {
    const newRows = Array.from({ length: target - earned }, () => ({
      user_id: user.id,
      team_id: user.team_id,
      tree_type: "normal",
      species: pickRandomSpecies(theme),
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
    await supabase.from("users").update({ trees_earned: target }).eq("id", user.id);
    earned = target;
  } else if (target < earned) {
    const { data: victims, error: vErr } = await supabase
      .from("trees")
      .select("id")
      .eq("user_id", user.id)
      .eq("tree_type", "normal")
      .order("obtained_at", { ascending: false })
      .limit(earned - target);
    if (vErr) {
      return NextResponse.json({ message: "나무 회수 중 오류가 발생했습니다." }, { status: 500 });
    }
    const ids = (victims ?? []).map((v) => v.id);
    if (ids.length > 0) {
      await supabase.from("trees").delete().in("id", ids);
      reclaimed += ids.length;
    }
    await supabase.from("users").update({ trees_earned: target }).eq("id", user.id);
    earned = target;
  }

  // 9) 신약 일독 완료 알림 — 나무 지급 없이, 최초 1회만 알림 표시용 플래그를 세운다.
  //    special_tree_earned 컬럼을 "일독 완료 알림을 이미 받았는지" 플래그로 재사용.
  const { nextFlag, newlyCompleted } = resolveBibleCompletionFlag(total, special);
  if (nextFlag !== special) {
    await supabase.from("users").update({ special_tree_earned: nextFlag }).eq("id", user.id);
    special = nextFlag;
  }
  const bibleCompletedNewly = newlyCompleted;

  // 10) 응답
  return NextResponse.json({
    books: [...bookMap].map(([book_name, chapters]) => ({ book_name, chapters })),
    total_chapters: total,
    total_nt_chapters: TOTAL_NT_CHAPTERS,
    trees_earned: earned,
    next_tree_remaining: computeNextTreeRemaining(earned, total),
    completed_one_bible: isBibleCompleted(total),
    special_tree_earned: special,
    bible_completed_newly: bibleCompletedNewly,
    newly_earned: newlyEarned,
    reclaimed_count: reclaimed,
  });
}
