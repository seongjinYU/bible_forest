"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { THEMES } from "@/constants/themes";
import { ELEMENT_NAMES } from "@/constants/elements";

interface PlantedTree {
  species: string;
  x: number;
  y: number;
}

interface Props {
  plantedTrees: PlantedTree[];
  previewName: string;
  previewTeam: string;
}

export default function PlaceTreeContent({ plantedTrees, previewName, previewTeam }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();

  const treeId = searchParams.get("tree_id") ?? "";
  const species = searchParams.get("species") ?? "";
  const speciesNum = Number(species);
  const isNumbered = !isNaN(speciesNum) && speciesNum > 0;
  const elementName = isNumbered ? (ELEMENT_NAMES[theme]?.[speciesNum] ?? "") : "";
  const imgSrc = isNumbered ? `/assets/${theme}/${speciesNum}.png` : null;

  const forestRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isDarkBg = theme !== "forest";
  const textPrimary = isDarkBg ? "text-white" : "text-[#222222]";
  const textSecondary = isDarkBg ? "text-white/70" : "text-[#999999]";
  const textMuted = isDarkBg ? "text-white/80" : "text-[#555555]";

  function getPos(e: React.PointerEvent<HTMLDivElement>) {
    const rect = forestRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: parseFloat((Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100))).toFixed(1)),
      y: parseFloat((Math.max(0, Math.min(100, (e.clientY - rect.top) / rect.height * 100))).toFixed(1)),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const pos = getPos(e);
    if (pos) setPosition(pos);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const pos = getPos(e);
    if (pos) setPosition(pos);
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  async function handleConfirm() {
    if (!position || !treeId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg("");

    const res = await fetch("/api/v1/trees/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tree_id: treeId, x: position.x, y: position.y }),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.message ?? "배치에 실패했습니다.");
      return;
    }

    router.push("/storage", { transitionTypes: ["nav-back"] });
  }

  return (
    <>
      {/* 메인 화면 미리보기 오버레이 */}
      {previewMode && (
        <div className="fixed inset-0 z-50">
          <img
            src={`/assets/${theme}/bg.png`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* 기존 배치된 나무들 */}
          {plantedTrees.map((tree, i) => {
            const num = Number(tree.species);
            if (isNaN(num) || num <= 0) return null;
            return (
              <img
                key={i}
                src={`/assets/${theme}/${num}.png`}
                alt=""
                className="absolute w-12 h-12 object-contain pointer-events-none"
                style={{
                  left: `${tree.x}%`,
                  top: `${tree.y}%`,
                  transform: "translate(-50%, -90%)",
                }}
              />
            );
          })}

          {/* 현재 배치 중인 나무 */}
          {position && imgSrc && (
            <img
              src={imgSrc}
              alt=""
              className="absolute w-12 h-12 object-contain pointer-events-none drop-shadow-lg"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: "translate(-50%, -90%)",
              }}
            />
          )}

          {/* 메인 화면 UI 레이아웃 고스트 */}
          <div
            className="absolute inset-0 flex flex-col min-h-dvh pointer-events-none"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="h-[44px] flex items-end pb-1 justify-end px-4">
              <button
                onClick={() => setPreviewMode(false)}
                className="pointer-events-auto h-[34px] px-4 rounded-full bg-black text-white text-[13px] font-medium font-pretendard"
              >
                미리보기 종료
              </button>
            </div>
            <div className="px-6 pt-0 pb-2 flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-1.5">
                  <span className={cn("text-[24px] font-bold leading-none font-pretendard", textPrimary)}>
                    {previewName}
                  </span>
                  <span className={cn("text-[16px] font-pretendard", textSecondary)}>
                    {previewTeam}
                  </span>
                </div>
                <p className={cn("text-[16px] font-pretendard", textMuted)}>
                  {THEMES[theme].tagline}
                </p>
              </div>
              <div className={cn(
                "mt-2 shrink-0 h-[34px] px-[14px] rounded-[20px] border text-[14px] font-pretendard flex items-center",
                isDarkBg ? "border-white text-white" : "border-[#222222] text-[#222222]",
              )}>
                내 보관함
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                <p className={cn("text-[15px] font-pretendard mb-0.5", isDarkBg ? "text-white/80" : "text-[#555555]")}>
                  {THEMES[theme].statPhrase}
                </p>
                <div className="flex items-center gap-[3px] mb-1">
                  <span className={cn("text-[24px] font-semibold font-pretendard", isDarkBg ? "text-white" : "text-[#222222]")}>—</span>
                  <span className={cn("text-[24px] font-pretendard", isDarkBg ? "text-white" : "text-[#222222]")}>{THEMES[theme].unit}</span>
                  <div className={cn("w-1 h-1 rounded-full mx-[5px]", isDarkBg ? "bg-white/60" : "bg-[#2E9200]")} />
                  <span className={cn("text-[24px] font-semibold font-pretendard", isDarkBg ? "text-white" : "text-[#222222]")}>—</span>
                  <span className={cn("text-[24px] font-pretendard", isDarkBg ? "text-white" : "text-[#222222]")}>점</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className={cn("text-[18px] font-pretendard", isDarkBg ? "text-white/80" : "text-[#555555]")}>참여중</span>
                    <span className={cn("text-[18px] font-semibold font-pretendard", isDarkBg ? "text-white" : "text-[#222222]")}>—</span>
                    <span className={cn("text-[18px] font-pretendard", isDarkBg ? "text-white/80" : "text-[#555555]")}>명</span>
                  </div>
                  <div
                    className="h-[40px] px-5 rounded-full text-white text-[15px] font-semibold font-pretendard flex items-center"
                    style={{ backgroundColor: THEMES[theme].color }}
                  >
                    인증하기
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-safe pt-3">
              <div className={cn(
                "w-full h-[48px] rounded-[8px] flex items-center justify-center text-[16px] font-pretendard",
                isDarkBg
                  ? "bg-white/15 text-white backdrop-blur-sm"
                  : "bg-white/80 backdrop-blur-sm border border-white/60 text-[#222222]",
              )}>
                {THEMES[theme].forumsLabel}
              </div>
            </div>
          </div>

          {!position && (
            <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-black/50 rounded-[10px] px-4 py-2">
                <p className="text-white text-[13px] font-pretendard text-center whitespace-nowrap">
                  위치를 먼저 선택하면 미리보기에서 확인할 수 있어요
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 배치 UI */}
      <div className="h-dvh relative overflow-hidden">
        {/* 배경 — 메인 화면과 동일하게 full screen으로 렌더링 */}
        <img
          src={`/assets/${theme}/bg.png`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />

        {/* 배치 캔버스 — full screen으로 좌표계를 메인 화면과 일치 */}
        <div
          ref={forestRef}
          className={cn(
            "absolute inset-0 select-none touch-none",
            isDragging ? "cursor-grabbing" : "cursor-crosshair",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* 기존 배치된 나무들 */}
        <div className="absolute inset-0 pointer-events-none">
          {plantedTrees.map((tree, i) => {
            const num = Number(tree.species);
            if (isNaN(num) || num <= 0) return null;
            return (
              <img
                key={i}
                src={`/assets/${theme}/${num}.png`}
                alt=""
                className="absolute w-12 h-12 object-contain opacity-80"
                style={{
                  left: `${tree.x}%`,
                  top: `${tree.y}%`,
                  transform: "translate(-50%, -90%)",
                }}
              />
            );
          })}
        </div>

        {/* 배치 중인 나무 + 펄싱 링 */}
        {position && imgSrc && (
          <div
            className="absolute pointer-events-none"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          >
            <span className="absolute flex h-4 w-4" style={{ transform: "translate(-50%, -50%)" }}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-30" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-white opacity-15" />
            </span>
            <img
              src={imgSrc}
              alt=""
              className="w-16 h-16 object-contain drop-shadow-lg"
              style={{ transform: "translate(-50%, -90%)" }}
            />
          </div>
        )}

        {/* 상단 크롬 — compact glass header */}
        <div
          className="absolute top-0 left-0 right-0 z-10 bg-black/40 backdrop-blur-sm"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
            {imgSrc ? (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <img src={imgSrc} alt={elementName} className="w-7 h-7 object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold font-pretendard text-white leading-snug">
                {elementName || "아이템"}
              </p>
              <p className="text-[13px] font-pretendard text-white/60">
                {position ? "탭하거나 드래그로 위치를 바꿀 수 있어요" : "탭하거나 드래그해서 위치를 정해 주세요"}
              </p>
            </div>
            <button
              onClick={() => setPreviewMode(true)}
              className="shrink-0 flex flex-col items-center gap-0.5 text-white/70 hover:text-white"
              aria-label="메인 화면 미리보기"
            >
              <Eye size={20} />
              <span className="text-[10px] font-pretendard leading-none">미리보기</span>
            </button>
          </div>
        </div>

        {/* 하단 크롬 */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/40 backdrop-blur-sm border-t border-white/10 px-5 pb-safe pt-3 flex flex-col gap-2">
          {errorMsg && (
            <p className="text-center text-[13px] text-red-400 font-pretendard">
              {errorMsg}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/storage", { transitionTypes: ["nav-back"] })}
              className="w-[88px] h-[54px] rounded-[8px] bg-white/20 text-white text-[17px] font-medium font-noto shrink-0"
            >
              이전
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!position || isSubmitting}
              className="flex-1 h-[54px] rounded-[8px] text-[17px] font-medium font-noto transition-opacity disabled:opacity-40 text-white"
              style={{ backgroundColor: position ? THEMES[theme].color : "rgba(255,255,255,0.2)" }}
            >
              {isSubmitting ? "배치 중..." : "배치 완료"}
            </button>
          </div>
        </div>
      </div>

      {/* 배치 확인 팝업 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[358px] bg-white rounded-[8px] overflow-hidden">
            <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-2">
              <p className="text-[20px] font-medium text-[#222222] font-noto text-center">
                배치가 끝났나요?
              </p>
              <p className="text-[14px] font-medium text-[#F32F15] font-noto text-center">
                한 번 배치가 끝나면 수정이 불가합니다!
              </p>
            </div>
            <div className="flex border-t border-[#F0F0F0]">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-[54px] text-[17px] font-medium font-noto text-[#666666] border-r border-[#F0F0F0]"
              >
                이전
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleConfirm(); }}
                disabled={isSubmitting}
                className="flex-1 h-[54px] text-[17px] font-medium font-noto text-white bg-[#31C678] disabled:opacity-50"
              >
                배치 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
