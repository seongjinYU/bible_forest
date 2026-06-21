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
// │  권(book) 단위 bulk replace: 그 권의 체크 목록을 통째로 교체.       │
// │  나무 지급 + 회수(기준 이하면 최신순 삭제, 특별나무 포함)까지 처리. │
// │  명세: docs/api-spec.md 1-2                                       │
// └─────────────────────────────────────────────────────────────────┘
//
// Request Body:
//   { "book_name": "마태복음", "chapters": [1, 2, 3, 5] }
//   - chapters = 그 권에서 "현재 체크된 장 전체 목록" (빈 배열이면 그 권 전체 해제)
//
// 처리: 그 권 기존 bible_progress 전부 삭제 → 새 목록 insert → 총장수 재계산
//   → floor(총장수/10) 기준 일반 나무 지급/회수, 260장 기준 특별 나무 지급/회수.
//   회수는 obtained_at 최신순(배치된 나무 포함)으로 삭제. (Supabase는 DB로만, 로직은 백엔드)

type EarnedTree = { tree_id: string; tree_type: string; species: string; points: number };

export async function PATCH(request: Request) {
  // 1) 로그인 확인
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) 본문 파싱
  let body: { book_name?: unknown; chapters?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { book_name, chapters } = body;

  // 3) 검증 (책 + 장 목록)
  if (typeof book_name !== "string" || !Array.isArray(chapters)) {
    return NextResponse.json({ message: "올바르지 않은 요청입니다." }, { status: 400 });
  }
  const book = NT_BOOKS.find((b) => b.name === book_name);
  if (!book) {
    return NextResponse.json({ message: "올바르지 않은 책 또는 장입니다." }, { status: 400 });
  }
  const chapterSet = new Set<number>();
  for (const c of chapters) {
    if (typeof c !== "number" || !Number.isInteger(c) || c < 1 || c > book.chapters) {
      return NextResponse.json({ message: "올바르지 않은 책 또는 장입니다." }, { status: 400 });
    }
    chapterSet.add(c);
  }
  const chapterList = [...chapterSet].sort((a, b) => a - b);

  const supabase = createSupabaseServerClient();

  // 4) 챌린지 기간 검증 (C1)
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

  // 5) 권 단위 bulk replace: 그 권 기존 행 삭제 → 새 목록 insert
  const { error: delErr } = await supabase
    .from("bible_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("book_name", book_name);
  if (delErr) {
    return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
  if (chapterList.length > 0) {
    const rows = chapterList.map((c) => ({ user_id: user.id, book_name, chapter: c }));
    const { error: insErr } = await supabase.from("bible_progress").insert(rows);
    if (insErr) {
      return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
    }
  }

  // 6) 총 장수 재계산
  const { count, error: cErr } = await supabase
    .from("bible_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (cErr) {
    return NextResponse.json({ message: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
  const total = count ?? 0;

  // 팀 테마 결정 (지급할 나무 종류 풀)
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

  // 7) 일반 나무 — 기준(floor(total/10))에 맞춰 지급 또는 회수
  const target = Math.floor(total / 10);
  if (target > earned) {
    // 지급
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
    // 회수: 최신순(obtained_at desc)으로 (earned - target)그루 삭제 (배치된 것 포함)
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

  // 8) 특별 나무 — 260장 기준으로 지급 또는 회수
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
    // 1독 미만으로 내려가면 특별 나무도 회수
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

  // 9) 홈 페이지 캐시 무효화 (점수/나무 수 즉시 반영)
  revalidatePath("/");

  // 10) 응답
  return NextResponse.json({
    book_name,
    checked_chapters: chapterList,
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
