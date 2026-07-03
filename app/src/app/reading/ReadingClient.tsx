"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NT_BOOKS } from "@/constants/bible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { isSessionExpired } from "@/lib/clientAuth";

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

type DragState = {
  startCh: number;
  currentCh: number;
  mode: "add" | "remove";
};

export default function ReadingClient({
  initialProgress,
}: {
  initialProgress: { book_name: string; chapter: number }[];
}) {
  const router = useRouter();
  const [selectedBook, setSelectedBook] = useState<BookType>(NT_BOOKS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [allProgress] = useState<Map<string, Set<number>>>(
    () => buildProgressMap(initialProgress),
  );
  const [draftByBook, setDraftByBook] = useState<Map<string, Set<number>>>(() => {
    const m = new Map<string, Set<number>>();
    for (const { book_name, chapter } of initialProgress) {
      if (!m.has(book_name)) m.set(book_name, new Set());
      m.get(book_name)!.add(chapter);
    }
    return m;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 드래그 선택 상태
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  // 드롭다운: 열릴 때 현재 선택된 책으로 스크롤(순서는 그대로 유지)
  const dropdownListRef = useRef<HTMLDivElement>(null);
  const selectedBookItemRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!dropdownOpen) return;
    selectedBookItemRef.current?.scrollIntoView({ block: "center" });
  }, [dropdownOpen]);

  const draft = draftByBook.get(selectedBook.name) ?? new Set<number>();

  // 드래그 중에는 미리보기 상태로 렌더링
  const effectiveDraft: Set<number> = (() => {
    if (!dragState) return draft;
    const base = new Set(draft);
    const lo = Math.min(dragState.startCh, dragState.currentCh);
    const hi = Math.max(dragState.startCh, dragState.currentCh);
    for (let c = lo; c <= hi; c++) {
      if (dragState.mode === "add") base.add(c);
      else base.delete(c);
    }
    return base;
  })();

  const changedBooks = NT_BOOKS
    .map((b) => b.name)
    .filter((name) =>
      !setEquals(
        draftByBook.get(name) ?? new Set<number>(),
        allProgress.get(name) ?? new Set<number>(),
      ),
    );
  const dirty = changedBooks.length > 0;

  // 저장 후 총 장수 / 다음 아이템까지 계산
  const draftTotal = Array.from(draftByBook.values()).reduce((sum, s) => sum + s.size, 0);
  const currentTotal = Array.from(allProgress.values()).reduce((sum, s) => sum + s.size, 0);
  const willEarnTrees = Math.floor(draftTotal / 10) - Math.floor(currentTotal / 10);
  const chaptersUntilNext = draftTotal % 10 === 0 ? 10 : 10 - (draftTotal % 10);

  function toggleChapter(ch: number) {
    setDraftByBook((prev) => {
      const next = new Map(prev);
      const cur = new Set(prev.get(selectedBook.name) ?? []);
      if (cur.has(ch)) cur.delete(ch);
      else cur.add(ch);
      next.set(selectedBook.name, cur);
      return next;
    });
  }

  function commitDragRange(startCh: number, currentCh: number, mode: "add" | "remove") {
    setDraftByBook((prev) => {
      const next = new Map(prev);
      const base = new Set(prev.get(selectedBook.name) ?? []);
      const lo = Math.min(startCh, currentCh);
      const hi = Math.max(startCh, currentCh);
      for (let c = lo; c <= hi; c++) {
        if (mode === "add") base.add(c);
        else base.delete(c);
      }
      next.set(selectedBook.name, base);
      return next;
    });
  }

  function getChapterAtPoint(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y);
    const attr = el?.closest("[data-chapter]")?.getAttribute("data-chapter");
    return attr ? Number(attr) : null;
  }

  function handleGridPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const ch = getChapterAtPoint(e.clientX, e.clientY);
    if (ch === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const mode = draft.has(ch) ? "remove" : "add";
    setDragState({ startCh: ch, currentCh: ch, mode });
  }

  function handleGridPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const ch = getChapterAtPoint(e.clientX, e.clientY);
    if (ch === null || ch === dragState.currentCh) return;
    navigator.vibrate?.(5);
    setDragState((prev) => prev ? { ...prev, currentCh: ch } : null);
  }

  function handleGridPointerUp() {
    if (!dragState) return;
    const { startCh, currentCh, mode } = dragState;
    if (startCh === currentCh) {
      navigator.vibrate?.(5);
      toggleChapter(startCh);
    } else {
      commitDragRange(startCh, currentCh, mode);
    }
    setDragState(null);
  }

  function handleComplete() {
    if (!dirty) return;
    setErrorMsg("");
    setShowConfirm(true);
  }

  async function handleConfirm() {
    if (isSubmitting) return;
    setShowConfirm(false);
    setIsSubmitting(true);
    const books = changedBooks.map((name) => ({
      book_name: name,
      chapters: Array.from(draftByBook.get(name) ?? []).sort((a, b) => a - b),
    }));

    // 낙관적 이동: 입력은 이미 클라이언트에서 검증된 상태이므로 응답을 기다리지 않고
    // 바로 홈으로 이동한다. 실패해도 다음에 /reading 진입 시 서버가 실제 상태를 다시 내려주므로
    // 여기서 되돌릴 필요는 없다 — 실패 메시지만 홈에 전달해 토스트로 알린다.
    router.push("/", { transitionTypes: ["nav-back"] });

    const res = await fetch("/api/v1/bible/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ books }),
    });
    setIsSubmitting(false);
    if (isSessionExpired(res)) return;
    if (!res.ok) {
      // 이미 홈으로 이동한 뒤이므로, 되돌리지 않고 홈이 읽어 토스트로 알리도록 위임한다.
      const data = await res.json().catch(() => ({}));
      sessionStorage.setItem("reading_save_error", data.message ?? "저장에 실패했습니다.");
      return;
    }
    const data = await res.json();
    if (data.newly_earned?.length > 0) {
      sessionStorage.setItem(
        "newly_earned_species",
        JSON.stringify(data.newly_earned.map((i: { species: string }) => i.species)),
      );
    } else {
      // 획득 아이템이 없어도 홈 통계(장수/진행률)는 최신화되어야 한다.
      sessionStorage.setItem("reading_saved", "1");
    }
  }

  function selectBook(book: BookType) {
    setSelectedBook(book);
    setDropdownOpen(false);
    setDragState(null);
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      {/* AppBar */}
      <div className="flex items-start px-4 pt-[22px] shrink-0 relative" style={{ paddingTop: "max(22px, env(safe-area-inset-top))" }}>
        <h1 className="flex-1 text-center text-[17px] font-semibold font-pretendard text-[#222222]">
          인증하기
        </h1>
        <button
          onClick={() => router.push("/", { transitionTypes: ["nav-back"] })}
          className="absolute right-4 w-[24px] h-[24px] flex items-center justify-center"
          style={{ top: "max(18px, env(safe-area-inset-top))" }}
          aria-label="닫기"
        >
          <X size={24} className="text-[#222222]" />
        </button>
      </div>

      <div className="px-5 pt-3 pb-4 relative shrink-0 flex items-center justify-between">
        <button onClick={() => setDropdownOpen((v) => !v)} className="flex items-center gap-1.5">
          <span
            className="text-[#222222] font-noto"
            style={{ fontWeight: 500, fontSize: 24, lineHeight: "150%", letterSpacing: "-0.025em" }}
          >
            {selectedBook.name}
          </span>
          <span
            className="shrink-0"
            style={{
              width: 0,
              height: 0,
              marginTop: 3,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "6px solid #222222",
            }}
          />
        </button>

        {(() => {
          const allOn = effectiveDraft.size === selectedBook.chapters;
          const allChapters = Array.from({ length: selectedBook.chapters }, (_, i) => i + 1);
          return (
            <button
              onClick={() => {
                setDraftByBook((prev) => {
                  const next = new Map(prev);
                  next.set(selectedBook.name, allOn ? new Set() : new Set(allChapters));
                  return next;
                });
              }}
              className="flex items-center gap-1.5 font-pretendard text-[#222222]"
            >
              <span
                className={cn(
                  "w-[24px] h-[24px] rounded-[4px] border flex items-center justify-center shrink-0",
                  allOn ? "border-[#31C678] bg-[#31C678]" : "border-[#DDDDDD] bg-white",
                )}
              >
                {allOn && <Check size={16} className="text-white" strokeWidth={3} />}
              </span>
              <span
                style={{ fontWeight: 400, fontSize: 14, lineHeight: "120%", letterSpacing: "-0.025em", textAlign: "center" }}
              >
                전체선택
              </span>
            </button>
          );
        })()}

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div ref={dropdownListRef} className="absolute left-5 top-full mt-1 z-50 bg-white border border-[#EEEEEE] rounded-[12px] shadow-lg max-h-[280px] overflow-y-auto w-[200px]">
              {NT_BOOKS.map((book) => {
                const cnt = (draftByBook.get(book.name) ?? new Set()).size;
                const isSelected = selectedBook.name === book.name;
                return (
                  <button
                    key={book.name}
                    ref={isSelected ? selectedBookItemRef : undefined}
                    onClick={() => selectBook(book)}
                    className={cn(
                      "w-full text-left px-4 py-3 text-[15px] font-noto border-b border-[#F5F5F5] last:border-0 flex items-center justify-between",
                      isSelected ? "font-semibold" : "text-[#222222]",
                    )}
                    style={isSelected ? { color: "#0FC8B8" } : undefined}
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

      {/* 선택 장 수 */}
      <div className="px-5 pb-2 shrink-0">
        <span
          className="font-pretendard text-[#AAAAAA]"
          style={{ fontWeight: 400, fontSize: 14, lineHeight: "150%", letterSpacing: "-0.025em" }}
        >
          {String(effectiveDraft.size).padStart(2, "0")}장 선택됨
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        {(() => {
          const groups = buildPillGroups(effectiveDraft);
          const pillGroupStarts = new Map<number, number[]>();
          const pillNonFirsts = new Set<number>();
          for (const g of groups) {
            if (g.length > 1) {
              pillGroupStarts.set(g[0], g);
              for (let i = 1; i < g.length; i++) pillNonFirsts.add(g[i]);
            }
          }

          return (
            <div
              ref={gridRef}
              className="grid grid-cols-6 touch-none select-none"
              onPointerDown={handleGridPointerDown}
              onPointerMove={handleGridPointerMove}
              onPointerUp={handleGridPointerUp}
              onPointerCancel={handleGridPointerUp}
            >
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                if (pillNonFirsts.has(ch)) return null;

                const pillGroup = pillGroupStarts.get(ch);
                const chapterTextStyle: React.CSSProperties = {
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: "150%",
                  letterSpacing: "-0.025em",
                  textAlign: "center",
                };

                if (pillGroup) {
                  return (
                    <div
                      key={ch}
                      style={{ gridColumn: `span ${pillGroup.length}` }}
                      className="h-14 flex items-center"
                    >
                      <div
                        style={{ background: GRADIENT }}
                        className="flex-1 h-12 rounded-full flex items-center overflow-hidden"
                      >
                        {pillGroup.map((c) => (
                          <span
                            key={c}
                            data-chapter={c}
                            className="flex-1 h-full flex items-center justify-center font-pretendard text-white"
                            style={chapterTextStyle}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }

                const isOn = effectiveDraft.has(ch);
                const isDragTarget =
                  dragState !== null &&
                  ch >= Math.min(dragState.startCh, dragState.currentCh) &&
                  ch <= Math.max(dragState.startCh, dragState.currentCh);

                return (
                  <div key={ch} data-chapter={ch} className="h-14 flex items-center">
                    <span
                      data-chapter={ch}
                      className={cn(
                        "h-12 w-12 flex items-center justify-center font-pretendard rounded-full mx-auto transition-transform",
                        !isOn && "border border-[#EEEEEE] bg-white text-[#999999]",
                        isOn && "text-white",
                        isDragTarget && "scale-110",
                      )}
                      style={{ ...chapterTextStyle, ...(isOn ? { background: GRADIENT } : {}) }}
                    >
                      {ch}
                    </span>
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

      <div className="px-6 pt-3 flex gap-3 shrink-0" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
        <button
          onClick={() => {
            setDraftByBook((prev) => {
              const next = new Map(prev);
              next.set(selectedBook.name, new Set());
              return next;
            });
          }}
          className="w-[88px] h-[54px] rounded-[8px] bg-[#F5F5F5] text-[#666666] font-noto text-center shrink-0"
          style={{ fontWeight: 400, fontSize: 16, lineHeight: "150%", letterSpacing: "-0.025em" }}
        >
          초기화
        </button>
        <button
          onClick={handleComplete}
          disabled={!dirty || isSubmitting}
          className="flex-1 h-[54px] rounded-[8px] bg-[#31C678] text-white font-noto text-center transition-opacity disabled:opacity-40"
          style={{ fontWeight: 400, fontSize: 16, lineHeight: "150%", letterSpacing: "-0.025em" }}
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
            <div className="border border-[#EEEEEE] rounded-[8px] px-4 py-4 flex flex-col gap-2 max-h-[180px] overflow-y-auto">
              {changedBooks.map((name) => (
                <div key={name} className="flex gap-4 text-[15px] font-pretendard">
                  <span className="text-[#AAAAAA] shrink-0 min-w-[64px]">{name}</span>
                  <span className="text-[#222222]">
                    {formatChapters(Array.from(draftByBook.get(name) ?? []))}
                  </span>
                </div>
              ))}
            </div>

            {/* 총 장수 + 다음 아이템까지 */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[13px] text-[#AAAAAA] font-pretendard">
                총 <span className="text-[#222222] font-semibold">{draftTotal}장</span> 읽음
              </span>
              {willEarnTrees > 0 ? (
                <span className="text-[13px] font-semibold font-pretendard text-[#31C678]">
                  아이템 +{willEarnTrees}개 획득!
                </span>
              ) : willEarnTrees < 0 ? (
                <span className="text-[13px] font-pretendard text-[#F32F15]">
                  아이템 {-willEarnTrees}개 반납됨
                </span>
              ) : (
                <span className="text-[13px] text-[#AAAAAA] font-pretendard">
                  다음 아이템까지{" "}
                  <span className="text-[#222222] font-semibold">{chaptersUntilNext}장</span>
                </span>
              )}
            </div>

            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full h-[54px] rounded-[8px] bg-[#31C678] text-white text-[18px] font-medium font-noto disabled:opacity-50"
            >
              확인
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
