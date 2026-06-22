"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NT_BOOKS } from "@/constants/bible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/context/ThemeContext";
import { ELEMENT_NAMES } from "@/constants/elements";

const COLS = 6;
const GRADIENT = "linear-gradient(90deg, #0FC8B8 0%, #13BD7F 100%)";

function formatChapters(chapters: number[]): string {
  if (chapters.length === 0) return "없음";
  const sorted = [...chapters].sort((a, b) => a - b);
  const ranges: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    ranges.push(j === i ? `${sorted[i]}` : `${sorted[i]}~${sorted[j]}`);
    i = j + 1;
  }
  return ranges.join(", ") + "장";
}

function buildPillGroups(sel: Set<number>): number[][] {
  const sorted = Array.from(sel).sort((a, b) => a - b);
  const groups: number[][] = [];
  let cur: number[] = [];
  for (const ch of sorted) {
    if (cur.length === 0) {
      cur.push(ch);
    } else {
      const prev = cur[cur.length - 1];
      const consecutive = ch === prev + 1;
      const startsNewRow = (ch - 1) % COLS === 0;
      if (consecutive && !startsNewRow) cur.push(ch);
      else { groups.push(cur); cur = [ch]; }
    }
  }
  if (cur.length > 0) groups.push(cur);
  return groups;
}

type BookType = (typeof NT_BOOKS)[number];

function buildProgressMap(
  rows: { book_name: string; chapter: number }[],
): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const { book_name, chapter } of rows) {
    if (!map.has(book_name)) map.set(book_name, new Set());
    map.get(book_name)!.add(chapter);
  }
  return map;
}

function setEquals(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export default function ReadingClient({
  initialProgress,
}: {
  initialProgress: { book_name: string; chapter: number }[];
}) {
  const router = useRouter();
  const theme = useTheme();
  const [selectedBook, setSelectedBook] = useState<BookType>(NT_BOOKS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // 서버에 저장된 상태(권별)
  const [allProgress, setAllProgress] = useState<Map<string, Set<number>>>(
    () => buildProgressMap(initialProgress),
  );
  // 편집 중인 체크 상태(권별) — 여러 권을 넘나들며 누적, 완료 시 바뀐 권만 한 번에 저장
  const [draftByBook, setDraftByBook] = useState<Map<string, Set<number>>>(() => {
    const m = new Map<string, Set<number>>();
    for (const { book_name, chapter } of initialProgress) {
      if (!m.has(book_name)) m.set(book_name, new Set());
      m.get(book_name)!.add(chapter);
    }
    return m;
  });
  // 범위 선택 앵커(같은 권 안에서 한 장 탭 → 다른 장 탭하면 그 사이를 채움)
  const [anchorChapter, setAnchorChapter] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [earnedItems, setEarnedItems] = useState<string[]>([]);
  const [earnedIndex, setEarnedIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // 현재 보고 있는 권의 draft
  const draft = draftByBook.get(selectedBook.name) ?? new Set<number>();

  // 저장본과 달라진 권 목록
  const changedBooks = NT_BOOKS
    .map((b) => b.name)
    .filter((name) =>
      !setEquals(
        draftByBook.get(name) ?? new Set<number>(),
        allProgress.get(name) ?? new Set<number>(),
      ),
    );
  const dirty = changedBooks.length > 0;

  function setCurrentBookDraft(chapters: Set<number>, anchor: number | null) {
    setDraftByBook((prev) => {
      const next = new Map(prev);
      next.set(selectedBook.name, chapters);
      return next;
    });
    setAnchorChapter(anchor);
  }

  // 장 탭: 선택됨이면 해제(앵커 초기화) / 앵커 있으면 범위 채움 / 없으면 단일 추가 + 앵커
  function toggleChapter(ch: number) {
    const cur = new Set(draftByBook.get(selectedBook.name) ?? []);
    if (cur.has(ch)) {
      cur.delete(ch);
      setCurrentBookDraft(cur, null);
    } else if (anchorChapter !== null) {
      const lo = Math.min(anchorChapter, ch);
      const hi = Math.max(anchorChapter, ch);
      for (let c = lo; c <= hi; c++) cur.add(c);
      setCurrentBookDraft(cur, ch);
    } else {
      cur.add(ch);
      setCurrentBookDraft(cur, ch);
    }
  }

  function handleComplete() {
    if (!dirty) return;
    setErrorMsg("");
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);
    setIsSubmitting(true);
    const books = changedBooks.map((name) => ({
      book_name: name,
      chapters: Array.from(draftByBook.get(name) ?? []).sort((a, b) => a - b),
    }));
    const res = await fetch("/api/v1/bible/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // 여러 권을 한 번에 bulk replace
      body: JSON.stringify({ books }),
    });
    setIsSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.message ?? "저장에 실패했습니다.");
      return;
    }
    const data = await res.json();
    // 저장본을 draft로 갱신 (바뀐 권만)
    setAllProgress((prev) => {
      const next = new Map(prev);
      for (const name of changedBooks) {
        next.set(name, new Set(draftByBook.get(name) ?? []));
      }
      return next;
    });
    if (data.newly_earned?.length > 0) {
      setEarnedItems(data.newly_earned.map((i: { species: string }) => i.species));
      setEarnedIndex(0);
    } else {
      router.push("/", { transitionTypes: ["nav-back"] });
    }
  }

  function selectBook(book: BookType) {
    setSelectedBook(book);
    setDropdownOpen(false);
    setAnchorChapter(null);
    // draft는 권별로 유지됨(초기화 안 함) → 여러 권 누적 선택 가능
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      <div className="h-11" />

      <div className="h-[54px] flex items-center justify-center relative px-4 shrink-0">
        <span className="text-[17px] font-medium text-[#222222] font-noto">인증하기</span>
      </div>

      <div className="px-5 pt-3 pb-4 relative shrink-0 flex items-center justify-between">
        <button onClick={() => setDropdownOpen((v) => !v)} className="flex items-center gap-1.5">
          <span className="text-[28px] font-bold text-[#222222] font-noto leading-tight">
            {selectedBook.name}
          </span>
          <ChevronDown size={22} className="text-[#222222] mt-1 shrink-0" />
        </button>

        {(() => {
          const allOn = draft.size === selectedBook.chapters;
          const allChapters = Array.from({ length: selectedBook.chapters }, (_, i) => i + 1);
          return (
            <button
              onClick={() => setCurrentBookDraft(allOn ? new Set() : new Set(allChapters), null)}
              className="text-[14px] font-pretendard text-[#0FC8B8]"
            >
              {allOn ? "전체 해제" : "전체 선택"}
            </button>
          );
        })()}

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute left-5 top-full mt-1 z-50 bg-white border border-[#EEEEEE] rounded-[12px] shadow-lg max-h-[280px] overflow-y-auto w-[200px]">
              {NT_BOOKS.map((book) => {
                const cnt = (draftByBook.get(book.name) ?? new Set()).size;
                return (
                  <button
                    key={book.name}
                    onClick={() => selectBook(book)}
                    className={cn(
                      "w-full text-left px-4 py-3 text-[15px] font-noto border-b border-[#F5F5F5] last:border-0 flex items-center justify-between",
                      selectedBook.name === book.name ? "font-semibold" : "text-[#222222]",
                    )}
                    style={selectedBook.name === book.name ? { color: "#0FC8B8" } : undefined}
                  >
                    <span>{book.name}</span>
                    {cnt > 0 && (
                      <span className="text-[12px] text-[#0FC8B8] font-pretendard">{cnt}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        {(() => {
          const groups = buildPillGroups(draft);
          const pillGroupStarts = new Map<number, number[]>();
          const pillNonFirsts = new Set<number>();
          for (const g of groups) {
            if (g.length > 1) {
              pillGroupStarts.set(g[0], g);
              for (let i = 1; i < g.length; i++) pillNonFirsts.add(g[i]);
            }
          }

          return (
            <div className="grid grid-cols-6">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                if (pillNonFirsts.has(ch)) return null;

                const pillGroup = pillGroupStarts.get(ch);
                if (pillGroup) {
                  return (
                    <div
                      key={ch}
                      style={{ gridColumn: `span ${pillGroup.length}` }}
                      className="h-12 flex items-center"
                    >
                      <div
                        style={{ background: GRADIENT }}
                        className="flex-1 h-10 rounded-full flex items-center overflow-hidden"
                      >
                        {pillGroup.map((c) => (
                          <button
                            key={c}
                            onClick={() => toggleChapter(c)}
                            className="flex-1 h-full flex items-center justify-center text-[14px] font-medium font-pretendard text-white select-none"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                const isOn = draft.has(ch);
                return (
                  <div key={ch} className="h-12 flex items-center">
                    <button
                      onClick={() => toggleChapter(ch)}
                      className={cn(
                        "h-10 w-10 flex items-center justify-center text-[14px] font-medium font-pretendard transition-colors select-none rounded-full mx-auto",
                        !isOn && "border border-[#E0E0E0] bg-white text-[#AAAAAA]",
                        isOn && "text-white",
                      )}
                      style={isOn ? { background: GRADIENT } : undefined}
                    >
                      {ch}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {errorMsg && (
        <p className="text-center text-[13px] text-[#F32F15] font-pretendard px-5 pb-1">
          {errorMsg}
        </p>
      )}

      <div className="px-5 pb-safe pt-3 flex gap-3 shrink-0">
        <button
          onClick={() => router.push("/", { transitionTypes: ["nav-back"] })}
          className="w-[88px] h-[54px] rounded-[8px] bg-[#F5F5F5] text-[#666666] text-[17px] font-medium font-noto shrink-0"
        >
          이전
        </button>
        <button
          onClick={handleComplete}
          disabled={!dirty || isSubmitting}
          className="flex-1 h-[54px] rounded-[8px] bg-[#31C678] text-white text-[17px] font-medium font-noto transition-opacity disabled:opacity-40"
        >
          {isSubmitting ? "저장 중..." : "완료"}
        </button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent showCloseButton={false} className="p-0 gap-0 rounded-[12px]">
          <div className="flex items-center justify-end px-4 pt-4">
            <button onClick={() => setShowConfirm(false)} className="w-10 h-10 flex items-center justify-center">
              <X size={20} className="text-[#222222]" />
            </button>
          </div>
          <div className="px-5 pb-6 flex flex-col gap-5">
            <div className="flex flex-col items-center gap-1">
              <DialogTitle className="text-[20px] font-bold text-[#222222] text-center font-noto leading-snug">
                선택한 내용으로 저장할까요?
              </DialogTitle>
              <p className="text-[14px] text-[#888888] text-center font-noto whitespace-pre-line leading-relaxed">
                {"인증할 성경을 정확히 선택하셨는지\n다시 한번 확인해 주세요."}
              </p>
            </div>
            <div className="border border-[#EEEEEE] rounded-[8px] px-4 py-4 flex flex-col gap-2 max-h-[220px] overflow-y-auto">
              {changedBooks.map((name) => (
                <div key={name} className="flex gap-4 text-[15px] font-pretendard">
                  <span className="text-[#AAAAAA] shrink-0 min-w-[64px]">{name}</span>
                  <span className="text-[#222222]">
                    {formatChapters(Array.from(draftByBook.get(name) ?? []))}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={handleConfirm} className="w-full h-[54px] rounded-[8px] bg-[#31C678] text-white text-[18px] font-medium font-noto">
              확인
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={earnedItems.length > 0}
        onOpenChange={(open) => {
          if (!open) { setEarnedItems([]); router.push("/", { transitionTypes: ["nav-back"] }); }
        }}
      >
        <DialogContent showCloseButton={false} className="p-0 gap-0 rounded-[12px]">
          {(() => {
            const currentSpecies = earnedItems[earnedIndex] ?? null;
            const speciesNum = Number(currentSpecies);
            const isNumbered = !isNaN(speciesNum) && speciesNum > 0;
            const name = isNumbered ? (ELEMENT_NAMES[theme]?.[speciesNum] ?? "") : "";
            const total = earnedItems.length;
            const isLast = earnedIndex === total - 1;

            function closeEarned() { setEarnedItems([]); router.push("/", { transitionTypes: ["nav-back"] }); }
            function nextEarned() {
              if (!isLast) setEarnedIndex((i) => i + 1);
              else closeEarned();
            }

            return (
              <>
                <div className="flex items-center justify-end px-4 pt-4">
                  <button onClick={closeEarned} className="w-10 h-10 flex items-center justify-center">
                    <X size={20} className="text-[#222222]" />
                  </button>
                </div>
                <div className="px-5 pb-6 flex flex-col items-center gap-5">
                  <div className="flex flex-col items-center gap-1">
                    <DialogTitle className="text-[20px] font-bold text-[#222222] text-center font-noto leading-snug">
                      와! 새로운 아이템을 획득했어요!
                    </DialogTitle>
                    {total > 1 && (
                      <p className="text-[13px] text-[#0FC8B8] font-pretendard font-medium">
                        {earnedIndex + 1} / {total}
                      </p>
                    )}
                    <p className="text-[14px] text-[#888888] text-center font-noto">
                      [내 보관함]에서 확인하고 아이템을 심어보세요!
                    </p>
                  </div>
                  <div className="w-[120px] h-[120px] rounded-full bg-[#F5F5F5] flex items-center justify-center">
                    {isNumbered ? (
                      <img
                        src={`/assets/${theme}/${speciesNum}.png`}
                        alt={name}
                        className="w-[80px] h-[80px] object-contain"
                      />
                    ) : (
                      <span className="text-[56px]">🌳</span>
                    )}
                  </div>
                  {name && (
                    <p className="text-[15px] font-pretendard text-[#222222] -mt-2">{name}</p>
                  )}
                  <button onClick={nextEarned} className="w-full h-[54px] rounded-[8px] bg-[#31C678] text-white text-[18px] font-medium font-noto">
                    {isLast ? "확인" : "다음"}
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
