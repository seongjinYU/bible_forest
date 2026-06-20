"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, AlertCircle } from "lucide-react";
import { toBlob } from "html-to-image";
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

interface MainScreenProps {
  name: string;
  team: string;
  stats: Stats;
  plantedTrees: PlantedTree[];
}

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

export default function MainScreen({ name, team, stats, plantedTrees }: MainScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const contentLayerRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTheme = THEMES[theme];
  const isStarTheme = theme === "night";

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  function showToast(message: string, action?: { label: string; onClick: () => void }) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, action });
    toastTimerRef.current = setTimeout(() => setToast(null), action ? 5000 : 2500);
  }

  async function handleDownload() {
    if (!screenRef.current || !contentLayerRef.current) return;
    const layer = contentLayerRef.current;
    try {
      setToast(null);
      layer.style.visibility = "hidden";
      await new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));

      // 모바일에서 html-to-image가 <img> src를 캔버스에 못 그리는 문제 방지:
      // 캡처 전 모든 이미지를 data URL로 변환해 직접 주입
      const allImgs = Array.from(screenRef.current.querySelectorAll("img")) as HTMLImageElement[];
      const originalSrcs = allImgs.map((img) => img.src);
      await Promise.all(
        allImgs.map(async (img, i) => {
          try {
            const resp = await fetch(originalSrcs[i]);
            const imgBlob = await resp.blob();
            await new Promise<void>((res, rej) => {
              const reader = new FileReader();
              reader.onload = () => { img.src = reader.result as string; res(); };
              reader.onerror = rej;
              reader.readAsDataURL(imgBlob);
            });
          } catch {
            // 실패 시 원본 src 유지
          }
        })
      );

      const blob = await toBlob(screenRef.current, {
        pixelRatio: window.devicePixelRatio || 2,
      });

      allImgs.forEach((img, i) => { img.src = originalSrcs[i]; });
      layer.style.visibility = "visible";

      if (!blob) return;

      const file = new File([blob], "bible-forest.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "팀 숲 성경읽기" });
      } else if (navigator.share) {
        await navigator.share({ title: "팀 숲 성경읽기", text: "함께 심고 함께 자라는 팀 숲 성경읽기 챌린지" });
      } else {
        // 데스크톱 폴백
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bible-forest.png";
        a.click();
        URL.revokeObjectURL(url);
        showToast("이미지가 저장되었습니다!");
      }
    } catch (err) {
      layer.style.visibility = "visible";
      // 사용자가 공유 시트를 닫은 경우는 에러 아님
      if (!(err instanceof Error && err.name === "AbortError")) {
        showToast("이미지 저장에 실패했습니다.");
      }
    }
  }

  const isDarkBg = theme !== "forest";
  const textPrimary = isDarkBg ? "text-white" : "text-[#222222]";
  const textSecondary = isDarkBg ? "text-white/70" : "text-[#999999]";
  const textMuted = isDarkBg ? "text-white/80" : "text-[#555555]";


  return (
    <div ref={screenRef} className="relative min-h-dvh overflow-hidden">
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

      {/* 콘텐츠 레이어 */}
      <div ref={contentLayerRef} className="relative z-10 flex flex-col min-h-dvh" style={{ paddingTop: "env(safe-area-inset-top)" }}>
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
        <div className="px-6 pt-0 pb-2 flex items-start justify-between">
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
            onClick={() => router.push("/storage")}
            className={`mt-2 shrink-0 h-[34px] px-[14px] rounded-[20px] border text-[14px] font-pretendard ${
              isDarkBg ? "border-white text-white" : "border-[#222222] text-[#222222]"
            }`}
          >
            내 보관함
          </button>
        </div>

        {/* 숲 인터랙션 영역 */}
        <div className="flex-1 relative">
          {/* 통계 오버레이 */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
            <p className={`text-[15px] font-pretendard mb-0.5 ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>
              {currentTheme.statPhrase}
            </p>
            <div className="flex items-center gap-[3px] mb-1">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className={`text-[18px] font-pretendard ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>참여중</span>
                <span className={`text-[18px] font-semibold font-pretendard ${isDarkBg ? "text-white" : "text-[#222222]"}`}>
                  {stats.participants}
                </span>
                <span className={`text-[18px] font-pretendard ${isDarkBg ? "text-white/80" : "text-[#555555]"}`}>명</span>
              </div>
              <button
                onClick={() => router.push("/reading")}
                className="h-[40px] px-5 rounded-full text-white text-[15px] font-semibold font-pretendard"
                style={{ backgroundColor: currentTheme.color }}
              >
                인증하기
              </button>
            </div>
          </div>
        </div>

        {/* 다른 숲 */}
        <div className="px-6 pb-safe pt-3">
          <button
            onClick={() => router.push("/forests")}
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
