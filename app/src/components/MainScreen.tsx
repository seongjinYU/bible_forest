"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, AlertCircle, Pencil, Play, Pause } from "lucide-react";
import { THEMES } from "@/constants/themes";
import { useTheme } from "@/context/ThemeContext";
import { BGM_TITLE, useBgm } from "@/context/BgmContext";
import { getItemDisplaySize } from "@/constants/itemSizes";
import { AVATAR_PALETTE } from "@/constants/avatars";
import { ONBOARDING_ICON } from "@/constants/onboarding";

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
  teamId: string;
  stats: Stats;
  plantedTrees: PlantedTree[];
  storageCount: number;
  totalChapters: number;
  lastReadAt: string | null;
  participants: Participant[];
}

const INFO_ITEMS = [
  {
    title: "성경을 1장 읽을 때마다 인증해보세요!",
    sub: "1장은 점수만 부여되며, 10장 이상부터\n나무를 획득할 수 있어요!",
  },
  {
    title: "인증 시 랜덤으로 나무를 획득할 수 있어요!",
    sub: "신약일독을 달성하면 특별한 나무가 주어져요!",
  },
  { title: "획득한 나무를 원하는 위치에 심어보세요!" },
  {
    title: "최종적으로 가장 점수가 높은 팀에게는\n수련회 당일 특별한 상품이 지급됩니다!",
  },
] as const;

type ToastState = { message: string; action?: { label: string; onClick: () => void } } | null;

export default function MainScreen({ name, team, teamId, stats, plantedTrees, storageCount, totalChapters, lastReadAt, participants = [] }: MainScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentName, setCurrentName] = useState(name);
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const bgmTitle = BGM_TITLE[theme];
  const { playing: bgmPlaying, toggle: toggleBgm } = useBgm();
  const [toast, setToast] = useState<ToastState>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const downloadOverlayRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTheme = THEMES[theme];
  const isStarTheme = theme === "night";

  const diffDaysForTagline = lastReadAt
    ? Math.floor((Date.now() - new Date(lastReadAt).getTime()) / 86400000)
    : null;
  const hasReadToday = diffDaysForTagline === 0;
  const completed260 = totalChapters >= 260;
  const tagline = completed260
    ? "축하합니다! 신약 일독을 달성했어요!"
    : hasReadToday
    ? `벌써 ${totalChapters}장 읽었어요!`
    : currentTheme.tagline;

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

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
        const sz = getItemDisplaySize(theme, num);
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
        ctx.fillText(currentName, nameR.left - screenRect.left, nameR.bottom - screenRect.top);
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
        await navigator.share({ files: [file] });
      } else if (navigator.share) {
        await navigator.share({ files: [file] });
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
    ? "bg-white/10 backdrop-blur-md border border-white/10"
    : "bg-white/20 backdrop-blur-[2px] border border-white/40";


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
          const size = getItemDisplaySize(theme, num);
          return (
            <img
              key={i}
              src={`/assets/${theme}/${num}.png`}
              alt=""
              className="absolute object-contain"
              style={{
                width: size,
                height: size,
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
              {currentName}
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
          {bgmTitle ? (
            <button
              onClick={toggleBgm}
              className={`h-[30px] px-3 rounded-full border flex items-center gap-1.5 text-[12px] font-pretendard ${
                isDarkBg ? "border-white/70 text-white" : "border-[#222222]/60 text-[#222222]"
              }`}
              aria-label={`${bgmTitle} ${bgmPlaying ? "멈춤" : "재생"}`}
            >
              {bgmPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{bgmTitle}</span>
            </button>
          ) : (
            <div className="w-10 h-10" />
          )}
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
                  {currentName}
                </span>
                <button
                  onClick={() => { setEditValue(currentName); setEditError(""); setEditOpen(true); }}
                  className="ml-0.5 self-center"
                  aria-label="닉네임 수정"
                >
                  <Pencil size={15} className={textSecondary} />
                </button>
                <span className={`text-[16px] font-pretendard ${textSecondary}`}>
                  {team}
                </span>
              </div>
              <p className={`text-[16px] font-pretendard ${textPrimary}`}>
                {tagline}
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

        </div>

        {/* 숲 인터랙션 영역 */}
        <div className="flex-1 relative">
          {/* 빈 숲 온보딩 힌트 */}
          {plantedTrees.length === 0 && (
            <div className="absolute top-1/3 left-0 right-0 flex flex-col items-center -translate-y-1/2 pointer-events-none">
              <div className="animate-bounce-ball flex flex-col items-center">
                <div className="px-5 py-3 rounded-full bg-black/70 backdrop-blur-sm flex items-center gap-2">
                  <span className="text-[16px]">{ONBOARDING_ICON[theme]}</span>
                  <p className="text-[15px] font-semibold font-pretendard text-white whitespace-nowrap">
                    성경을 읽고 인증해보세요!
                  </p>
                </div>
                <div className="-mt-px w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-black/70" />
              </div>
            </div>
          )}

          {/* 통계 오버레이 */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <div className={`rounded-[20px] px-5 py-4 ${glassCard}`}>
              <p className={`text-[15px] font-pretendard mb-0.5 ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>
                {currentTheme.statPhrase}
              </p>
              <div className="flex items-center gap-[3px] mb-3">
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

              {/* 진행률 바 */}
              {(() => {
                const completed = totalChapters >= 260;
                const done = totalChapters % 10;
                const progressPct = completed ? 100 : done / 10 * 100;
                const diffDays = lastReadAt ? Math.floor((Date.now() - new Date(lastReadAt).getTime()) / 86400000) : null;
                const nudge = diffDays === null ? null : diffDays === 0 ? "오늘 인증했어요" : diffDays === 1 ? "어제 마지막으로 인증했어요" : `${diffDays}일째 인증을 안 했어요`;
                const isWarning = diffDays !== null && diffDays >= 2;
                return (
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[13px] font-pretendard ${isDarkBg ? "text-white/70" : "text-[#888888]"}`}>
                        {completed ? "신약일독 완료" : "다음 아이템 획득까지"}
                      </span>
                      <span className={`text-[13px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                        {completed ? "260/260장" : `${done}/10장 남았어요!`}
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full ${isDarkBg ? "bg-white/20" : "bg-black/10"}`}>
                      <div className="h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: currentTheme.color }} />
                    </div>
                    {nudge && (
                      <p
                        className="text-[12px] font-pretendard text-right"
                        style={{ color: isWarning ? "#FF6B6B" : diffDays === 0 ? currentTheme.color : isDarkBg ? "rgba(255,255,255,0.5)" : "#AAAAAA" }}
                      >
                        {nudge}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => router.push(`/forests/${teamId}/participants`, { transitionTypes: ["nav-forward"] })}
                  className="flex items-center gap-2 text-left"
                >
                  <span className={`text-[15px] font-pretendard ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>참여중</span>
                  <div className="flex items-center">
                    {participants.slice(0, 3).map((p, i) => {
                      const { bg, fg } = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
                      return (
                        <div
                          key={i}
                          className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-semibold font-pretendard border-[2px] border-white"
                          style={{ backgroundColor: bg, color: fg, marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }}
                        >
                          {p.nickname[0]}
                        </div>
                      );
                    })}
                  </div>
                  <span className={`text-[22px] font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>›</span>
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
            className="w-full h-[48px] rounded-[8px] text-[16px] font-pretendard text-white"
            style={{ backgroundColor: currentTheme.color }}
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

      {/* 닉네임 수정 모달 */}
      {editOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[320px] rounded-[14px] bg-white p-6 flex flex-col gap-4">
            <p className="text-[18px] font-bold font-noto text-[#222222] text-center">닉네임 수정</p>
            <input
              autoFocus
              type="text"
              value={editValue}
              maxLength={10}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full h-[50px] px-4 rounded-[8px] border border-[#DDDDDD] focus:border-[#46AE78] outline-none text-[16px] font-noto text-[#222222]"
            />
            {editError && <p className="text-[13px] text-[#F32F15] font-noto">{editError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 h-[50px] rounded-[8px] bg-[#F5F5F5] text-[#666666] text-[16px] font-medium font-noto"
              >
                취소
              </button>
              <button
                disabled={editSaving}
                onClick={async () => {
                  const next = editValue.trim();
                  if (!next) { setEditError("닉네임을 입력해주세요."); return; }
                  if (next === currentName) { setEditOpen(false); return; }
                  setEditSaving(true);
                  setEditError("");
                  const res = await fetch("/api/v1/users/me", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nickname: next }),
                  });
                  setEditSaving(false);
                  if (!res.ok) {
                    const data = await res.json();
                    setEditError(data.message ?? "수정에 실패했습니다.");
                    return;
                  }
                  setCurrentName(next);
                  setEditOpen(false);
                  router.refresh();
                }}
                className="flex-1 h-[50px] rounded-[8px] bg-[#31C678] text-white text-[16px] font-medium font-noto disabled:opacity-60"
              >
                {editSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
