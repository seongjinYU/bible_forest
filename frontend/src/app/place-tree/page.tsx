"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import AppBar from "@/components/AppBar";

const TREES_KEY      = "reading_trees";
const PLACEMENTS_KEY = "tree_placements";

type TreeType = "일반" | "특별";

interface Placement {
  x: number;
  y: number;
  type: TreeType;
}

const TREE_EMOJI: Record<TreeType, string> = { 일반: "🌲", 특별: "🌟" };

export default function PlaceTreePage() {
  const router = useRouter();
  const forestRef = useRef<HTMLDivElement>(null);

  const [availableTrees, setAvailableTrees] = useState(0);
  const [selectedType, setSelectedType]     = useState<TreeType>("일반");
  const [pendingPos, setPendingPos]          = useState<{ x: number; y: number } | null>(null);
  const [placements, setPlacements]          = useState<Placement[]>([]);

  useEffect(() => {
    setAvailableTrees(Number(localStorage.getItem(TREES_KEY) ?? 0));
    const raw = localStorage.getItem(PLACEMENTS_KEY);
    setPlacements(raw ? JSON.parse(raw) : []);
  }, []);

  function handleForestTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = forestRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPendingPos({
      x: parseFloat(((e.clientX - rect.left)  / rect.width  * 100).toFixed(1)),
      y: parseFloat(((e.clientY - rect.top)   / rect.height * 100).toFixed(1)),
    });
  }

  function handleComplete() {
    if (!pendingPos || availableTrees <= 0) return;
    const updated = [...placements, { ...pendingPos, type: selectedType }];
    setPlacements(updated);
    localStorage.setItem(PLACEMENTS_KEY, JSON.stringify(updated));
    const newCount = availableTrees - 1;
    setAvailableTrees(newCount);
    localStorage.setItem(TREES_KEY, String(newCount));
    router.back();
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="h-11" />

      <AppBar
        title="나무 배치"
        onBack={() => router.back()}
        className="border-b border-[#EEEEEE] text-[#222222]"
      />

      {/* 나무 선택 */}
      <div className="px-4 pt-4">
        <p className="text-[14px] text-[#999999] mb-3 font-pretendard">배치할 나무를 선택하세요</p>
        <div className="flex gap-3">
          {(["일반", "특별"] as TreeType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                "flex-1 h-[54px] rounded-[8px] border text-[16px] font-medium transition-colors font-noto",
                selectedType === type
                  ? "bg-[#F6FEF8] border-[#46AE78] text-[#222222]"
                  : "bg-white border-[#DDDDDD] text-[#222222]"
              )}
            >
              {TREE_EMOJI[type]} {type}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-[#999999] mt-2 font-pretendard">
          보유 나무 <span className="font-semibold text-[#31C678]">{availableTrees}</span>그루
        </p>
      </div>

      {/* 숲 배치 영역 */}
      <div className="px-4 mt-4 flex-1 flex flex-col">
        <div
          ref={forestRef}
          onClick={handleForestTap}
          className="relative w-full flex-1 rounded-[12px] overflow-hidden cursor-crosshair"
          style={{ minHeight: 320, background: "linear-gradient(to bottom, #2D6A4F, #95D5B2)" }}
        >
          {placements.map((p, i) => (
            <span
              key={i}
              className="absolute text-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {TREE_EMOJI[p.type]}
            </span>
          ))}

          {pendingPos && (
            <span
              className="absolute text-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-bounce"
              style={{ left: `${pendingPos.x}%`, top: `${pendingPos.y}%` }}
            >
              {TREE_EMOJI[selectedType]}
            </span>
          )}

          {!pendingPos && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-white/60 text-[14px] font-pretendard">원하는 위치를 탭해 주세요</p>
            </div>
          )}
        </div>

        {pendingPos && (
          <p className="text-[12px] text-[#999999] text-center mt-2 font-pretendard">
            위치를 다시 탭하면 변경할 수 있어요
          </p>
        )}
      </div>

      {/* 배치 완료 버튼 */}
      <div className="px-4 pt-3 pb-9">
        <button
          onClick={handleComplete}
          disabled={!pendingPos || availableTrees <= 0}
          className={cn(
            "w-full h-[54px] rounded-[8px] text-[20px] font-medium transition-colors font-noto",
            pendingPos && availableTrees > 0
              ? "bg-[#31C678] text-white"
              : "bg-[#F5F5F5] text-[#666666]"
          )}
        >
          배치 완료
        </button>
      </div>
    </div>
  );
}
