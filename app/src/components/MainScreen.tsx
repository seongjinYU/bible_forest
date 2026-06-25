"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, AlertCircle } from "lucide-react";
import { THEMES } from "@/constants/themes";
import { useTheme } from "@/context/ThemeContext";

interface Stats {
  trees: number;
  score: number;
  participants: number;
}

interface PlantedTree {
  species: string;
  x: number;
  y: number;
}

interface Participant {
  nickname: string;
  score: number;
  joinedAt: string;
}

interface MainScreenProps {
  name: string;
  team: string;
  stats: Stats;
  plantedTrees: PlantedTree[];
  storageCount: number;
  totalChapters: number;
  participants: Participant[];
}

const AVATAR_PALETTE = [
  { bg: "#B8E4DA", fg: "#0F6B55" },
  { bg: "#F5C5A8", fg: "#B5451A" },
  { bg: "#F5DDB8", fg: "#8B5A10" },
  { bg: "#D4B8F5", fg: "#5A1A9B" },
  { bg: "#B8D9F5", fg: "#1A3A8B" },
  { bg: "#F5B8D4", fg: "#9B1A5A" },
];
const MAX_AVATARS = 4;

const INFO_ITEMS = [
  {
    title: "성경을 1장 읽을 때마다 인증해보세요!",
    sub: "1장은 점수만 부여되며, 10장 이상부터\n나무를 획득할 수 있어요!",
  },
  {
    title: "인증 시 랜덤으로 나무를 획득할 수 있어요!",
    sub: "신약일독을 달성하면 특별한 나무를 심을 수 있어요!",
  },
  { title: "획득한 나무를 원하는 위치에 심어보세요!" },
  {
    title: "최종적으로 가장 점수가 높은 팀에게는\n수련회 당일 특별한 상품이 지급됩니다!",
  },
] as const;

type ToastState = { message: string; action?: { label: string; onClick: () => void } } | null;

export default function MainScreen({ name, team, stats, plantedTrees, storageCount, totalChapters, participants = [] }: MainScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const downloadOverlayRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetDragStartY = useRef<number | null>(null);
  const sheetScrollRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const currentTheme = THEMES[theme];
  const isStarTheme = theme === "night";

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !showParticipants) return;
    const onTouchMove = (e: TouchEvent) => {
      if (sheetDragStartY.current === null) return;
      const dy = e.touches[0].clientY - sheetDragStartY.current;
      if (dy <= 0) return;
      e.preventDefault();
      setSheetDragY(dy);
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [showParticipants]);

  function showToast(message: string, action?: { label: string; onClick: () => void }) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, action });
    toastTimerRef.current = setTimeout(() => setToast(null), action ? 5000 : 2500);
  }

  async function handleDownload() {
    if (!screenRef.current || !downloadOverlayRef.current) return;
    try {
      setToast(null);

      // fetch → objectURL 방식: 브라우저 이미지 캐시를 우회해 canvas taint 없이 로드
      async function loadImg(src: string): Promise<HTMLImageElement> {
        try {
          const resp = await fetch(src);
          const blob = await resp.blob();
          const objUrl = URL.createObjectURL(blob);
          return await new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(objUrl); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(img); };
            img.src = objUrl;
          });
        } catch {
          return await new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
            img.src = src;
          });
        }
      }

      const screenRect = screenRef.current.getBoundingClientRect();
      const W = screenRect.width;
      const H = screenRect.height;
      const dpr = window.devicePixelRatio || 2;

      // 필요한 이미지 병렬 로드
      const bgSrc = `/assets/${theme}/bg.png`;
      const treeSrcs = [...new Set(
        plantedTrees
          .map((t) => Number(t.species))
          .filter((n) => !isNaN(n) && n > 0)
          .map((n) => `/assets/${theme}/${n}.png`),
      )];
      const imgMap = new Map<string, HTMLImageElement>();
      await Promise.all(
        [bgSrc, ...treeSrcs].map(async (src) => { imgMap.set(src, await loadImg(src)); })
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);

      // 1. 배경 (object-cover 시뮬레이션)
      const bg = imgMap.get(bgSrc)!;
      if (bg.naturalWidth > 0) {
        const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
        const bw = bg.naturalWidth * s;
        const bh = bg.naturalHeight * s;
        ctx.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh);
      }

      // 2. 배치된 나무
      for (const tree of plantedTrees) {
        const num = Number(tree.species);
        if (isNaN(num) || num <= 0) continue;
        const ti = imgMap.get(`/assets/${theme}/${num}.png`);
        if (!ti || ti.naturalWidth === 0) continue;
        const sz = 48; // w-12 h-12
        ctx.drawImage(ti, (tree.x / 100) * W - sz / 2, (tree.y / 100) * H - sz * 0.9, sz, sz);
      }

      // 3. 닉네임 + 팀명 (visibility:hidden 상태에서도 getBoundingClientRect 는 정확함)
      await document.fonts.ready;
      const nameEl = downloadOverlayRef.current.querySelector<HTMLElement>('[data-dl="name"]');
      const teamEl = downloadOverlayRef.current.querySelector<HTMLElement>('[data-dl="team"]');
      const nameR = nameEl?.getBoundingClientRect();
      const teamR = teamEl?.getBoundingClientRect();
      if (nameR) {
        ctx.font = `bold 24px 'Pretendard Variable', Pretendard, sans-serif`;
        ctx.fillStyle = isDarkBg ? "rgba(255,255,255,1)" : "#222222";
        ctx.textBaseline = "bottom";
        ctx.fillText(name, nameR.left - screenRect.left, nameR.bottom - screenRect.top);
      }
      if (teamR) {
        ctx.font = `16px 'Pretendard Variable', Pretendard, sans-serif`;
        ctx.fillStyle = isDarkBg ? "rgba(255,255,255,0.7)" : "#999999";
        ctx.textBaseline = "bottom";
        ctx.fillText(team, teamR.left - screenRect.left, teamR.bottom - screenRect.top);
      }

      // 4. 내보내기
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) { showToast("이미지 저장에 실패했습니다."); return; }

      const file = new File([blob], "bible-forest.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "팀 숲 성경읽기" });
      } else if (navigator.share) {
        await navigator.share({ title: "팀 숲 성경읽기", text: "함께 심고 함께 자라는 팀 숲 성경읽기 챌린지" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bible-forest.png";
        a.click();
        URL.revokeObjectURL(url);
        showToast("이미지가 저장되었습니다!");
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        showToast("이미지 저장에 실패했습니다.");
      }
    }
  }

  const isDarkBg = theme !== "forest";
  const textPrimary = isDarkBg ? "text-white" : "text-[#222222]";
  const textSecondary = isDarkBg ? "text-white/70" : "text-[#999999]";
  const textMuted = isDarkBg ? "text-white/80" : "text-[#555555]";
  const glassCard = isDarkBg
    ? "bg-white/10 backdrop-blur-md"
    : "bg-white/60 backdrop-blur-md";


  return (
    <div ref={screenRef} className="relative h-svh overflow-hidden">
      {/* 전체화면 배경 */}
      <div className="absolute inset-0">
        <img src={`/assets/${theme}/bg.png`} alt="" className="w-full h-full object-cover" />
      </div>

      {/* 배치된 나무 레이어 */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        {plantedTrees.map((tree, i) => {
          const num = Number(tree.species);
          if (isNaN(num) || num <= 0) return null;
          return (
            <img
              key={i}
              src={`/assets/${theme}/${num}.png`}
              alt=""
              className="absolute w-12 h-12 object-contain"
              style={{
                left: `${tree.x}%`,
                top: `${tree.y}%`,
                transform: "translate(-50%, -90%)",
              }}
            />
          );
        })}
      </div>

      {/* 다운로드 전용 오버레이 — 이미지 캡처 시에만 표시 */}
      <div
        ref={downloadOverlayRef}
        className="absolute inset-0 z-[2] pointer-events-none flex flex-col"
        style={{ visibility: "hidden", paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-[44px]" />
        <div className="px-6">
          <div className="flex items-baseline gap-1.5">
            <span data-dl="name" className={`text-[24px] font-bold leading-none font-pretendard ${textPrimary}`}>
              {name}
            </span>
            <span data-dl="team" className={`text-[16px] font-pretendard ${textSecondary}`}>
              {team}
            </span>
          </div>
        </div>
      </div>

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex flex-col h-svh" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {/* AppBar */}
        <div className="h-[44px] flex items-end pb-1 justify-between px-4">
          <div className="w-10 h-10" />
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="w-[26px] h-[26px] flex items-center justify-center"
              aria-label="이미지 저장"
            >
              <Download size={22} className={textPrimary} />
            </button>
            <button
              onClick={() => setHelpOpen(true)}
              className="w-[26px] h-[26px] flex items-center justify-center"
              aria-label="도움말"
            >
              <AlertCircle size={22} className={textPrimary} />
            </button>
          </div>
        </div>

        {/* 유저 정보 */}
        <div className="mx-4 mt-1 px-4 py-3 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[24px] font-bold leading-none font-pretendard ${textPrimary}`}>
                  {name}
                </span>
                <span className={`text-[16px] font-pretendard ${textSecondary}`}>
                  {team}
                </span>
              </div>
              <p className={`text-[16px] font-pretendard ${textMuted}`}>
                {currentTheme.tagline}
              </p>
            </div>
            <button
              onClick={() => router.push("/storage", { transitionTypes: ["nav-forward"] })}
              style={{ position: "relative" }}
              className={`mt-2 shrink-0 h-[34px] px-[14px] rounded-[20px] border text-[14px] font-pretendard ${
                isDarkBg ? "border-white text-white" : "border-[#222222] text-[#222222]"
              }`}
            >
              내 보관함
              {storageCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -7,
                    right: -7,
                    minWidth: 20,
                    height: 20,
                    padding: "0 5px",
                    borderRadius: 9999,
                    backgroundColor: currentTheme.color,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                  aria-label={`보관중 ${storageCount}개`}
                >
                  {storageCount > 99 ? "99+" : storageCount}
                </span>
              )}
            </button>
          </div>

          {/* 다음 획득까지 진행률 바 */}
          {(() => {
            const nextMilestone = (Math.floor(totalChapters / 10) + 1) * 10;
            const progressPct = (totalChapters % 10) / 10 * 100;
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[13px] font-pretendard ${isDarkBg ? "text-white/70" : "text-[#888888]"}`}>
                    다음 획득까지
                  </span>
                  <span className={`text-[13px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                    {totalChapters}/{nextMilestone}장
                  </span>
                </div>
                <div className={`h-1.5 rounded-full ${isDarkBg ? "bg-white/20" : "bg-black/10"}`}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progressPct}%`, backgroundColor: currentTheme.color }}
                  />
                </div>
              </div>
            );
          })()}
        </div>

        {/* 숲 인터랙션 영역 */}
        <div className="flex-1 relative">
          {/* 빈 숲 온보딩 힌트 */}
          {plantedTrees.length === 0 && (
            <div className="absolute top-1/3 left-0 right-0 flex flex-col items-center px-8 -translate-y-1/2 pointer-events-none">
              <div className={`px-5 py-4 rounded-[16px] flex flex-col items-center gap-1.5 text-center ${isDarkBg ? "bg-white/15 backdrop-blur-sm" : "bg-black/[0.06] backdrop-blur-sm"}`}>
                <p className={`text-[15px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#333333]"}`}>
                  {storageCount > 0 ? "첫 번째 나무를 심어보세요!" : "성경을 읽으면 나무를 얻을 수 있어요!"}
                </p>
                <p className={`text-[13px] font-pretendard ${isDarkBg ? "text-white/70" : "text-[#777777]"}`}>
                  {storageCount > 0 ? "보관함에서 나무를 배치해 숲을 채워보세요" : "10장 읽을 때마다 아이템을 획득해요"}
                </p>
              </div>
            </div>
          )}

          {/* 통계 오버레이 */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <div className={`rounded-[20px] px-5 py-4 ${glassCard}`}>
              <p className={`text-[15px] font-pretendard mb-0.5 ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>
                {currentTheme.statPhrase}
              </p>
              <div className="flex items-center gap-[3px] mb-2">
                <span className={`text-[24px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                  {stats.trees}
                </span>
                <span className={`text-[24px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>{currentTheme.unit}</span>
                <div className={`w-1 h-1 rounded-full mx-[5px] ${isDarkBg ? "bg-white/60" : "bg-[#2E9200]"}`} />
                <span className={`text-[24px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                  {stats.score}
                </span>
                <span className={`text-[24px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>점</span>
              </div>

              <div className="flex items-end justify-between">
                <button
                  onClick={() => setShowParticipants(true)}
                  className="flex flex-col gap-1 text-left"
                >
                  <span className={`text-[15px] font-pretendard ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>참여중</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {participants.slice(0, MAX_AVATARS).map((p, i) => {
                        const { bg, fg } = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
                        return (
                          <div
                            key={i}
                            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-semibold font-pretendard border-[2px] border-white"
                            style={{ backgroundColor: bg, color: fg, marginLeft: i > 0 ? -8 : 0, zIndex: MAX_AVATARS - i }}
                          >
                            {p.nickname[0]}
                          </div>
                        );
                      })}
                    </div>
                    <span className={`text-[18px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                      {stats.participants}명
                    </span>
                    <span className={`text-[22px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>›</span>
                  </div>
                </button>
                <button
                  onClick={() => router.push("/reading", { transitionTypes: ["nav-forward"] })}
                  className="h-[40px] px-5 rounded-full text-white text-[15px] font-semibold font-pretendard"
                  style={{ backgroundColor: currentTheme.color }}
                >
                  인증하기
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 다른 숲 */}
        <div className="px-6 pb-safe pt-3">
          <button
            onClick={() => router.push("/forests", { transitionTypes: ["nav-forward"] })}
            className={`w-full h-[48px] rounded-[8px] text-[16px] font-pretendard ${
              isDarkBg
                ? "bg-white/15 text-white backdrop-blur-sm"
                : "bg-white/80 backdrop-blur-sm border border-white/60 text-[#222222]"
            }`}
          >
            {currentTheme.forumsLabel}
          </button>
        </div>
      </div>

      {/* Popup_info */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[358px] bg-white rounded-[8px] overflow-hidden">
            <div className="px-4 pt-9 pb-6 flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-[20px] font-medium leading-[28px] tracking-[-0.03em] text-[#222222] text-center font-noto">
                  성경읽기 인증하고 나무를 심어보세요!
                </h2>
                <p className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto">
                  게임 참여 방법 안내
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {INFO_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-[#35985B] flex items-center justify-center mt-0.5">
                      <span className="text-[14px] font-medium text-white font-pretendard leading-none">{i + 1}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[16px] font-normal leading-[150%] text-[#000000] font-pretendard whitespace-pre-line">
                        {item.title}
                      </p>
                      {"sub" in item && (
                        <p className="text-[15px] font-normal leading-[150%] text-[#999999] font-pretendard whitespace-pre-line">
                          {item.sub}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              className="w-full py-3 bg-[#31C678] text-white text-[18px] font-medium font-noto"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 참여 현황 팝업 */}
      {showParticipants && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => { setShowParticipants(false); setSheetDragY(0); }}
        >
          <div
            ref={sheetRef}
            className="w-full bg-white rounded-t-[20px] h-[50vh] flex flex-col"
            style={{ transform: `translateY(${Math.max(0, sheetDragY)}px)`, transition: sheetDragStartY.current !== null ? "none" : "transform 0.25s ease" }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              const atTop = (sheetScrollRef.current?.scrollTop ?? 0) === 0;
              sheetDragStartY.current = atTop ? e.touches[0].clientY : null;
            }}
            onTouchEnd={() => {
              if (sheetDragY > 80) {
                setShowParticipants(false);
                setSheetDragY(0);
              } else {
                setSheetDragY(0);
              }
              sheetDragStartY.current = null;
            }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </div>
            <div className="px-5 py-3 flex items-center justify-between shrink-0">
              <h2 className="text-[17px] font-semibold font-pretendard text-[#222222]">팀 참여 현황</h2>
              <span className="text-[14px] font-pretendard text-[#AAAAAA]">{participants.length}명</span>
            </div>
            <div ref={sheetScrollRef} className="overflow-y-auto pb-safe">
              {participants.map((p, i) => {
                const { bg, fg } = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
                const d = new Date(p.joinedAt);
                const dateLabel = `${String(d.getFullYear()).slice(-2)}.${d.getMonth() + 1}.${d.getDate()}`;
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#F0F0F0] last:border-0">
                    <div
                      className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[17px] font-semibold font-pretendard shrink-0"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      {p.nickname[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-semibold font-pretendard text-[#222222] truncate">
                        {p.nickname} · {p.score}점
                      </p>
                      <p className="text-[13px] font-pretendard text-[#AAAAAA] mt-0.5">
                        {dateLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-[#222222]/90 rounded-full text-white text-[14px] font-pretendard whitespace-nowrap flex items-center gap-3">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="text-[#31C678] font-semibold"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
