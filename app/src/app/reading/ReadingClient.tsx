"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NT_BOOKS } from "@/constants/bible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const COLS = 6;
const GRADIENT = "linear-gradient(90deg, #0FC8B8 0%, #13BD7F 100%)";

function formatChapters(chapters: number[]): string {
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

function lerpColor(t: number) {
  const r = Math.round(15 + 4 * t);
  const g = Math.round(200 - 11 * t);
  const b = Math.round(184 - 57 * t);
  return `rgb(${r},${g},${b})`;
}

function buildPillMap(sel: Set<number>): Map<number, { idx: number; len: number }> {
  const sorted = Array.from(sel).sort((a, b) => a - b);
  const map = new Map<number, { idx: number; len: number }>();
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
  for (const g of groups) g.forEach((ch, i) => map.set(ch, { idx: i, len: g.length }));
  return map;
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

export default function ReadingClient({
  initialProgress,
}: {
  initialProgress: { book_name: string; chapter: number }[];
}) {
  const router = useRouter();
  const [selectedBook, setSelectedBook] = useState<BookType>(NT_BOOKS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [allProgress, setAllProgress] = useState<Map<string, Set<number>>>(
    () => buildProgressMap(initialProgress),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEarned, setShowEarned] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const alreadyRead = allProgress.get(selectedBook.name) ?? new Set<number>();

  function toggleChapter(ch: number) {
    if (alreadyRead.has(ch)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch); else next.add(ch);
      return next;
    });
  }

  function handleComplete() {
    if (selected.size === 0) return;
    setErrorMsg("");
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);
    setIsSubmitting(true);
    const chapters = Array.from(selected).map((ch) => ({
      book_name: selectedBook.name,
      chapter: ch,
    }));
    const res = await fetch("/api/v1/bible/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: true, chapters }),
    });
    setIsSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.message ?? "저장에 실패했습니다.");
      return;
    }
    const data = await res.json();
    setAllProgress((prev) => {
      const next = new Map(prev);
      const bookSet = new Set(next.get(selectedBook.name) ?? []);
      for (const ch of selected) bookSet.add(ch);
      next.set(selectedBook.name, bookSet);
      return next;
    });
    setSelected(new Set());
    if (data.newly_earned?.length > 0) setShowEarned(true);
    else router.push("/");
  }

  function selectBook(book: BookType) {
    setSelectedBook(book);
    setDropdownOpen(false);
    setSelected(new Set());
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
          const unread = Array.from({ length: selectedBook.chapters }, (_, i) => i + 1)
            .filter((ch) => !alreadyRead.has(ch));
          const allSelected = unread.length > 0 && unread.every((ch) => selected.has(ch));
          return (
            <button
              onClick={() => setSelected(allSelected ? new Set() : new Set(unread))}
              className="text-[14px] font-pretendard text-[#0FC8B8]"
            >
              {allSelected ? "전체 해제" : "전체 선택"}
            </button>
          );
        })()}

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute left-5 top-full mt-1 z-50 bg-white border border-[#EEEEEE] rounded-[12px] shadow-lg max-h-[280px] overflow-y-auto w-[180px]">
              {NT_BOOKS.map((book) => (
                <button
                  key={book.name}
                  onClick={() => selectBook(book)}
                  className={cn(
                    "w-full text-left px-4 py-3 text-[15px] font-noto border-b border-[#F5F5F5] last:border-0",
                    selectedBook.name === book.name ? "font-semibold" : "text-[#222222]",
                  )}
                  style={selectedBook.name === book.name ? { color: "#0FC8B8" } : undefined}
                >
                  {book.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        {(() => {
          const pillMap = buildPillMap(selected);
          return (
            <div className="grid grid-cols-6">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                const colIndex = (ch - 1) % COLS;
                const isRead = alreadyRead.has(ch);
                const isSel = selected.has(ch);
                const hasLeft = isSel && selected.has(ch - 1) && colIndex !== 0;
                const hasRight = isSel && selected.has(ch + 1) && colIndex !== COLS - 1;
                let bg: string | undefined;
                if (isSel) {
                  const p = pillMap.get(ch);
                  if (p && p.len > 1) {
                    const c1 = lerpColor(p.idx / p.len);
                    const c2 = lerpColor((p.idx + 1) / p.len);
                    bg = `linear-gradient(90deg, ${c1} 0%, ${c2} 100%)`;
                  } else bg = GRADIENT;
                } else if (isRead) bg = GRADIENT;
                return (
                  <div key={ch} className="h-12 flex items-center">
                    <button
                      onClick={() => toggleChapter(ch)}
                      disabled={isRead}
                      className={cn(
                        "h-10 flex items-center justify-center text-[14px] font-medium font-pretendard transition-colors select-none",
                        !isSel && !isRead && "w-10 rounded-full border border-[#E0E0E0] bg-white text-[#AAAAAA] mx-auto",
                        (isSel || isRead) && !hasLeft && !hasRight && "w-10 rounded-full mx-auto text-white",
                        isSel && !hasLeft && hasRight && "w-full rounded-l-full pl-[10px] text-white",
                        isSel && hasLeft && !hasRight && "w-full rounded-r-full pr-[10px] text-white",
                        isSel && hasLeft && hasRight && "w-full text-white",
                        isRead && "opacity-50",
                      )}
                      style={bg ? { background: bg } : undefined}
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
          onClick={() => router.push("/")}
          className="w-[88px] h-[54px] rounded-[8px] bg-[#F5F5F5] text-[#666666] text-[17px] font-medium font-noto shrink-0"
        >
          이전
        </button>
        <button
          onClick={handleComplete}
          disabled={selected.size === 0 || isSubmitting}
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
                선택하신 정보로 인증을 진행할까요?
              </DialogTitle>
              <p className="text-[14px] text-[#888888] text-center font-noto whitespace-pre-line leading-relaxed">
                {"인증할 성경을 정확히 입력하셨는지\n다시 한번 확인해 주세요."}
              </p>
            </div>
            <div className="border border-[#EEEEEE] rounded-[8px] px-4 py-4 flex flex-col gap-2">
              <div className="flex gap-4 text-[15px] font-pretendard">
                <span className="text-[#AAAAAA] w-4 shrink-0">권</span>
                <span className="text-[#222222]">{selectedBook.name}</span>
              </div>
              <div className="flex gap-4 text-[15px] font-pretendard">
                <span className="text-[#AAAAAA] w-4 shrink-0">장</span>
                <span className="text-[#222222]">{formatChapters(Array.from(selected))}</span>
              </div>
            </div>
            <button onClick={handleConfirm} className="w-full h-[54px] rounded-[8px] bg-[#31C678] text-white text-[18px] font-medium font-noto">
              확인
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEarned} onOpenChange={setShowEarned}>
        <DialogContent showCloseButton={false} className="p-0 gap-0 rounded-[12px]">
          <div className="flex items-center justify-end px-4 pt-4">
            <button onClick={() => { setShowEarned(false); router.push("/"); }} className="w-10 h-10 flex items-center justify-center">
              <X size={20} className="text-[#222222]" />
            </button>
          </div>
          <div className="px-5 pb-6 flex flex-col items-center gap-5">
            <div className="flex flex-col items-center gap-1">
              <DialogTitle className="text-[20px] font-bold text-[#222222] text-center font-noto leading-snug">
                와! 새로운 나무를 획득했어요!
              </DialogTitle>
              <p className="text-[14px] text-[#888888] text-center font-noto">
                [내 나무 보기]에서 확인하고 나무를 심어보세요!
              </p>
            </div>
            <div className="w-[120px] h-[120px] rounded-full bg-[#FFF0EC] flex items-center justify-center">
              <span className="text-[56px]">🌳</span>
            </div>
            <button onClick={() => { setShowEarned(false); router.push("/"); }} className="w-full h-[54px] rounded-[8px] bg-[#31C678] text-white text-[18px] font-medium font-noto">
              확인
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
