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
import { THEMES } from "@/constants/themes";
import type { ThemeKey } from "@/constants/themes";

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
  let rawBooks: unknown;
  if (Array.isArray(body.books)) {
    rawBooks = body.books;
  } else if (typeof body.book_name === "string") {
    rawBooks = [{ book_name: body.book_name, chapters: body.chapters }];
  } else {
    return NextResponse.json({ message: "올바르지 않은 요청입니다." }, { status: 400 });
  }
  const list = rawBooks as Array<{ book_name?: unknown; chapters?: unknown }>;
  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json({ message: "체크할 권이 없습니다." }, { status: 400 });
  }

  // 4) 검증 + 권별 dedupe (같은 권 중복 시 마지막 것 사용)
  const bookMap = new Map<string, number[]>();
  for (const b of list) {
    if (typeof b.book_name !== "string" || !Array.isArray(b.chapters)) {
      return NextResponse.json({ message: "올바르지 않은 요청입니다." }, { status: 400 });
    }
    const book = NT_BOOKS.find((x) => x.name === b.book_name);
    if (!book) {
      return NextResponse.json({ message: "올바르지 않은 책 또는 장입니다." }, { status: 400 });
    }
    const set = new Set<number>();
    for (const c of b.chapters) {
      if (typeof c !== "number" || !Number.isInteger(c) || c < 1 || c > book.chapters) {
        return NextResponse.json({ message: "올바르지 않은 책 또는 장입니다." }, { status: 400 });
      }
      set.add(c);
    }
    bookMap.set(b.book_name, [...set].sort((a, b2) => a - b2));
  }

  const supabase = createSupabaseServerClient();

  // 5) 챌린지 기간 검증 (C1)
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

  // 6) 권별 bulk replace: 각 권 기존 행 삭제 → 새 목록 일괄 insert
  for (const bookName of bookMap.keys()) {
    const { error: delErr } = await supabase
      .from("bible_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("book_name", bookName);
    if (delErr) {
      return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
    }
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

  // 팀 테마 (지급할 나무 종류 풀)
  const { data: teamData } = await supabase
    .from("teams")
    .select("theme")
    .eq("id", user.team_id)
    .single();
  const rawTheme = (teamData as { theme?: string | null } | null)?.theme;
  const theme: ThemeKey = rawTheme && rawTheme in THEMES ? (rawTheme as ThemeKey) : "forest";

  let earned = user.trees_earned;
  let special = user.special_tree_earned;
  const newlyEarned: EarnedTree[] = [];
  let reclaimed = 0;

  // 8) 일반 나무 — 기준(floor(total/10))에 맞춰 지급 또는 회수 (한 번만)
  const target = Math.floor(total / 10);
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

  // 9) 특별 나무 — 260장 기준 지급/회수
  let specialNew = false;
  if (total >= TOTAL_NT_CHAPTERS && !special) {
    await supabase.from("trees").insert({
      user_id: user.id,
      team_id: user.team_id,
      tree_type: "special",
      species: SPECIAL_SPECIES,
      points: REWARD.SPECIAL_TREE_POINTS,
    });
    await supabase.from("users").update({ special_tree_earned: true }).eq("id", user.id);
    special = true;
    specialNew = true;
  } else if (total < TOTAL_NT_CHAPTERS && special) {
    const { data: sp } = await supabase
      .from("trees")
      .select("id")
      .eq("user_id", user.id)
      .eq("tree_type", "special")
      .order("obtained_at", { ascending: false })
      .limit(1);
    const sid = (sp ?? []).map((v) => v.id);
    if (sid.length > 0) {
      await supabase.from("trees").delete().in("id", sid);
      reclaimed += sid.length;
    }
    await supabase.from("users").update({ special_tree_earned: false }).eq("id", user.id);
    special = false;
  }

  // 10) 홈 캐시 무효화
  revalidatePath("/");

  // 11) 응답
  return NextResponse.json({
    books: [...bookMap].map(([book_name, chapters]) => ({ book_name, chapters })),
    total_chapters: total,
    total_nt_chapters: TOTAL_NT_CHAPTERS,
    trees_earned: earned,
    next_tree_remaining: (earned + 1) * 10 - total,
    completed_one_bible: total >= TOTAL_NT_CHAPTERS,
    special_tree_earned: special,
    special_tree_newly_earned: specialNew,
    newly_earned: newlyEarned,
    reclaimed_count: reclaimed,
  });
}
