"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppBar from "@/components/AppBar";
import { NT_BOOKS, TOTAL_NT_CHAPTERS } from "@/constants/bible";

const STORAGE_KEY = "reading_checked";
const TREES_KEY   = "reading_trees";

export default function ReadingPage() {
  const router = useRouter();
  const [checked, setChecked]   = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [trees, setTrees]       = useState(0);
  const [newTreeAlert, setNewTreeAlert] = useState(false);
  const prevTotalRef = useRef(0);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const savedChecked: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    const savedTrees = Number(localStorage.getItem(TREES_KEY) ?? 0);
    setChecked(savedChecked);
    setTrees(savedTrees);
    prevTotalRef.current = Object.values(savedChecked).filter(Boolean).length;
    setExpanded({ [NT_BOOKS[0].name]: true });
  }, []);

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const progressPct  = Math.round((totalChecked / TOTAL_NT_CHAPTERS) * 100);

  function toggleChapter(book: string, chapter: number) {
    const key  = `${book}-${chapter}`;
    const next = { ...checked, [key]: !checked[key] };
    const nextTotal = Object.values(next).filter(Boolean).length;

    const gained = Math.floor(nextTotal / 10) - Math.floor(prevTotalRef.current / 10);
    if (gained > 0) {
      const updated = trees + gained;
      setTrees(updated);
      localStorage.setItem(TREES_KEY, String(updated));
      setNewTreeAlert(true);
    }

    prevTotalRef.current = nextTotal;
    setChecked(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function toggleExpand(bookName: string) {
    setExpanded((prev) => ({ ...prev, [bookName]: !prev[bookName] }));
  }

  function checkedCount(bookName: string, chapters: number) {
    return Array.from({ length: chapters }, (_, i) =>
      checked[`${bookName}-${i + 1}`] ? 1 : 0
    ).reduce((a: number, b: number) => a + b, 0);
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="h-11" />

      <AppBar
        title="성경읽기표"
        onBack={() => router.back()}
        className="border-b border-[#EEEEEE] text-[#222222]"
      />

      {/* 현황 요약 */}
      <div className="mx-4 mt-3 rounded-[8px] bg-[#F6FEF8] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[15px] text-[#222222] font-pretendard">
            누적 <span className="font-semibold text-[#31C678]">{totalChecked}</span>장
          </span>
          <div className="w-px h-4 bg-[#DDDDDD]" />
          <span className="text-[15px] text-[#222222] font-pretendard">
            나무 <span className="font-semibold text-[#31C678]">{trees}</span>그루
          </span>
        </div>
        <span className="text-[13px] text-[#999999] font-pretendard">
          {progressPct}% ({totalChecked}/{TOTAL_NT_CHAPTERS})
        </span>
      </div>

      {/* 진행 바 */}
      <div className="mx-4 mt-2 h-2 rounded-full bg-[#F5F5F5] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#31C678] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 책 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {NT_BOOKS.map(({ name, chapters }) => {
          const done   = checkedCount(name, chapters);
          const isOpen = !!expanded[name];

          return (
            <div key={name} className="border border-[#EEEEEE] rounded-[8px] overflow-hidden">
              <button
                onClick={() => toggleExpand(name)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white"
              >
                <div className="flex items-center gap-2">
                  {isOpen
                    ? <ChevronDown size={18} className="text-[#999999]" />
                    : <ChevronRight size={18} className="text-[#999999]" />
                  }
                  <span className="text-[16px] font-medium text-[#222222] font-noto">{name}</span>
                </div>
                <span
                  className={cn(
                    "text-[14px] font-pretendard",
                    done === chapters ? "text-[#31C678] font-semibold" : "text-[#999999]"
                  )}
                >
                  {done}/{chapters}장
                </span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 bg-[#FAFAFA]">
                  <div className="flex flex-wrap gap-2 pt-2">
                    {Array.from({ length: chapters }, (_, i) => i + 1).map((ch) => {
                      const isChecked = !!checked[`${name}-${ch}`];
                      return (
                        <button
                          key={ch}
                          onClick={() => toggleChapter(name, ch)}
                          className={cn(
                            "w-10 h-10 rounded-[8px] text-[14px] font-medium border transition-colors font-pretendard",
                            isChecked
                              ? "bg-[#31C678] text-white border-[#31C678]"
                              : "bg-white text-[#222222] border-[#DDDDDD]"
                          )}
                        >
                          {ch}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 나무 획득 팝업 */}
      <Dialog open={newTreeAlert} onOpenChange={setNewTreeAlert}>
        <DialogContent showCloseButton={false} className="p-0 gap-0 rounded-[12px]">
          <DialogHeader className="px-4 pt-6 pb-2 flex flex-col items-center">
            <span className="text-5xl mb-2">🌲</span>
            <DialogTitle className="text-[20px] font-semibold text-[#222222] text-center font-noto">
              나무를 획득했어요!
            </DialogTitle>
            <p className="text-[14px] text-[#666666] text-center mt-1 font-pretendard">
              랜덤 나무 1그루 획득 · 누적 {trees}그루 보유 중
            </p>
          </DialogHeader>
          <div className="px-4 pb-5 pt-3 flex flex-col gap-2">
            <button
              onClick={() => { setNewTreeAlert(false); router.push("/place-tree"); }}
              className="w-full h-[54px] rounded-[8px] bg-[#31C678] text-white text-[18px] font-medium font-noto"
            >
              숲에 배치하기
            </button>
            <button
              onClick={() => setNewTreeAlert(false)}
              className="w-full h-[44px] rounded-[8px] border border-[#DDDDDD] text-[#666666] text-[16px] font-pretendard"
            >
              나중에 배치
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
