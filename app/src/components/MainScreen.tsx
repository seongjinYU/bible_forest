"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, X, Download, Link2 } from "lucide-react";
import { THEMES } from "@/constants/themes";
import { useTheme } from "@/context/ThemeContext";

interface Stats {
  trees: number;
  score: number;
  participants: number;
}

interface MainScreenProps {
  name: string;
  team: string;
  stats: Stats;
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

function TreeIllustration() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, #C8ECFF 0%, #A8D870 55%, #5CBD50 100%)" }}
    >
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 390 240"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
      >
        {/* 뒤 언덕 */}
        <path
          d="M0 240 L0 160 Q60 100 130 130 Q200 160 270 110 Q330 75 390 120 L390 240 Z"
          fill="#6BC46B"
        />
        {/* 앞 언덕 */}
        <path
          d="M0 240 L0 185 Q55 145 115 165 Q180 188 250 148 Q310 118 390 158 L390 240 Z"
          fill="#3DB340"
        />
        {/* 나무들 (뒤 언덕) */}
        <circle cx="90"  cy="120" r="11" fill="#228B22" />
        <circle cx="108" cy="113" r="8"  fill="#1A7A1A" />
        <circle cx="195" cy="102" r="10" fill="#228B22" />
        <circle cx="212" cy="97"  r="7"  fill="#1A7A1A" />
        <circle cx="310" cy="108" r="9"  fill="#228B22" />
        {/* 나무들 (앞 언덕) */}
        <circle cx="60"  cy="156" r="12" fill="#1E7A1E" />
        <circle cx="80"  cy="148" r="9"  fill="#165F16" />
        <circle cx="160" cy="142" r="13" fill="#1E7A1E" />
        <circle cx="180" cy="136" r="9"  fill="#165F16" />
        <circle cx="300" cy="145" r="11" fill="#1E7A1E" />
        <circle cx="320" cy="139" r="8"  fill="#165F16" />
        <circle cx="350" cy="152" r="10" fill="#1E7A1E" />
      </svg>
    </div>
  );
}

function StarIllustration() {
  const stars = [
    { x: "15%", y: "12%" }, { x: "72%", y: "8%"  }, { x: "88%", y: "20%" },
    { x: "28%", y: "25%" }, { x: "55%", y: "15%" }, { x: "40%", y: "40%" },
    { x: "80%", y: "38%" }, { x: "10%", y: "50%" }, { x: "65%", y: "55%" },
    { x: "92%", y: "60%" }, { x: "25%", y: "65%" }, { x: "50%", y: "72%" },
    { x: "35%", y: "18%" }, { x: "60%", y: "32%" }, { x: "82%", y: "48%" },
    { x: "18%", y: "78%" }, { x: "70%", y: "22%" }, { x: "45%", y: "85%" },
  ];

  return (
    <div className="absolute inset-0">
      {/* 별들 */}
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: s.x,
            top: s.y,
            width: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
            height: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
            opacity: 0.6 + (i % 4) * 0.1,
          }}
        />
      ))}
      {/* 행성 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 90,
          height: 90,
          left: "55%",
          top: "30%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle at 35% 35%, #E0B0FF, #8040C0)",
          boxShadow: "0 0 30px 8px rgba(180, 100, 255, 0.35)",
        }}
      />
      {/* 달 */}
      <div
        className="absolute rounded-full bg-white"
        style={{
          width: 48,
          height: 48,
          left: "22%",
          top: "22%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 20px 6px rgba(255, 255, 255, 0.4)",
        }}
      />
    </div>
  );
}

export default function MainScreen({ name, team, stats }: MainScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const currentTheme = THEMES[theme];
  const isStarTheme = theme === "star";

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("링크가 복사되었습니다!");
      setShareOpen(false);
    } catch {
      showToast("복사에 실패했습니다.");
    }
  }

  return (
    <div
      className="flex flex-col min-h-dvh"
      style={{ background: currentTheme.pageBackground }}
    >
      {/* 상태바 */}
      <div className="h-11" />

      {/* AppBar */}
      <div className="h-[60px] flex items-center justify-between px-4">
        <div className="w-10 h-10" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="w-[26px] h-[26px] flex items-center justify-center"
            aria-label="공유"
          >
            <Upload size={22} className={isStarTheme ? "text-white" : "text-[#222222]"} />
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="w-[26px] h-[26px] flex items-center justify-center"
            aria-label="도움말"
          >
            <AlertCircle size={22} className={isStarTheme ? "text-white" : "text-[#222222]"} />
          </button>
        </div>
      </div>

      {/* 유저 정보 */}
      <div className="px-6 pt-2 pb-2 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[24px] font-bold leading-none font-pretendard ${isStarTheme ? "text-white" : "text-[#222222]"}`}>
              {name}
            </span>
            <span className={`text-[16px] font-pretendard ${isStarTheme ? "text-white/70" : "text-[#999999]"}`}>
              {team}
            </span>
          </div>
          <p className={`text-[16px] font-pretendard ${isStarTheme ? "text-white/80" : "text-[#222222]"}`}>
            팀 영혼들과 함께 나무를 심어보세요!
          </p>
        </div>
        <button
          onClick={() => router.push("/reading")}
          className={`shrink-0 h-[34px] px-[14px] rounded-[20px] border text-[14px] font-pretendard ${
            isStarTheme
              ? "border-white text-white"
              : "border-[#222222] text-[#222222]"
          }`}
        >
          내 기록 보기
        </button>
      </div>

      {/* 숲 영역 (일러스트 + 통계 오버레이) */}
      <div className="flex-1 relative overflow-hidden min-h-[360px]">
        {theme === "tree"  && <TreeIllustration />}
        {theme === "star"  && <StarIllustration />}
        {/* music: 배경 없음 */}

        {/* 인증 말풍선 */}
        <button
          onClick={() => router.push("/reading")}
          className="absolute left-1/2 -translate-x-1/2 bottom-[148px] flex items-center gap-1.5 px-4 h-[45px] bg-[#222222] rounded-full text-white text-[13px] font-pretendard whitespace-nowrap z-10"
        >
          <span>🦉</span>
          <span>
            <span className="font-semibold">클릭</span>해서{" "}
            <span className="font-semibold">인증</span>해보세요!
          </span>
        </button>

        {/* 재생 버튼 */}
        <button
          className="absolute bottom-[110px] left-6 w-6 h-6 rounded-full bg-[#FFAE00] flex items-center justify-center z-10"
          aria-label="재생"
        >
          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-white ml-0.5" />
        </button>

        {/* 통계 — 잔디/배경 위 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-5">
          <p className={`text-[15px] font-pretendard mb-0.5 ${theme === "music" ? "text-[#555555]" : "text-white/80"}`}>
            현재 우리 숲은?
          </p>
          <div className="flex items-center gap-[3px] mb-1">
            <span className={`text-[24px] font-semibold font-pretendard ${theme === "music" ? "text-[#222222]" : "text-white"}`}>
              {stats.trees}
            </span>
            <span className={`text-[24px] font-pretendard ${theme === "music" ? "text-[#222222]" : "text-white"}`}>그루</span>
            <div className={`w-1 h-1 rounded-full mx-[5px] ${theme === "music" ? "bg-[#2E9200]" : "bg-white/60"}`} />
            <span className={`text-[24px] font-semibold font-pretendard ${theme === "music" ? "text-[#222222]" : "text-white"}`}>
              {stats.score}
            </span>
            <span className={`text-[24px] font-pretendard ${theme === "music" ? "text-[#222222]" : "text-white"}`}>점</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className={`text-[18px] font-pretendard ${theme === "music" ? "text-[#555555]" : "text-white/80"}`}>참여중</span>
              <span className={`text-[18px] font-semibold font-pretendard ${theme === "music" ? "text-[#222222]" : "text-white"}`}>
                {stats.participants}
              </span>
              <span className={`text-[18px] font-pretendard ${theme === "music" ? "text-[#555555]" : "text-white/80"}`}>명</span>
            </div>
            <button className="w-[76px] h-[34px] rounded-[20px] bg-[#2E9200] text-white text-[14px] font-pretendard">
              초대하기
            </button>
          </div>
        </div>
      </div>

      {/* 다른 숲 */}
      <div className="px-6 pb-safe pt-3">
        <button
          onClick={() => router.push("/forests")}
          className={`w-full h-[48px] rounded-[8px] text-[16px] font-pretendard ${
            isStarTheme
              ? "bg-white/15 text-white backdrop-blur-sm"
              : "bg-white border border-[#DDDDDD] text-[#222222]"
          }`}
        >
          다른 숲 구경하러 가기
        </button>
      </div>

      {/* Popup_share */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[358px] bg-white rounded-[8px] overflow-hidden">
            <div className="h-[50px] flex items-center justify-end px-4">
              <button
                onClick={() => setShareOpen(false)}
                className="w-10 h-10 flex items-center justify-center"
                aria-label="닫기"
              >
                <X size={20} className="text-[#222222]" />
              </button>
            </div>
            <div className="px-4 pb-9 pt-6 flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-[20px] font-medium leading-[28px] tracking-[-0.03em] text-[#222222] text-center font-noto">
                  함께 하고 싶은 영혼에게 공유해보세요!
                </h2>
                <p className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto">
                  팀 영혼들과 서로 독려하며 함께 해요!
                </p>
              </div>
              <div className="flex items-start gap-6">
                <button className="flex flex-col items-center gap-4 w-20">
                  <div className="w-20 h-20 rounded-full bg-[#31C678] flex items-center justify-center">
                    <Download size={32} className="text-white" />
                  </div>
                  <span className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto whitespace-pre-line">
                    {"이미지\n다운로드"}
                  </span>
                </button>
                <button className="flex flex-col items-center gap-4 w-20">
                  <div className="w-20 h-20 rounded-full bg-[#FFEB00] flex items-center justify-center">
                    <span className="text-[28px] font-bold text-[#3B1D26] font-pretendard leading-none">K</span>
                  </div>
                  <span className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto whitespace-pre-line">
                    {"카카오톡\n공유"}
                  </span>
                </button>
                <button onClick={handleCopyLink} className="flex flex-col items-center gap-4 w-20">
                  <div className="w-20 h-20 rounded-full bg-[#F4F5F7] flex items-center justify-center">
                    <Link2 size={32} className="text-[#222222]" />
                  </div>
                  <span className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto">
                    링크 복사
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup_info */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[358px] bg-white rounded-[8px] overflow-hidden">
            <div className="h-[50px] flex items-center justify-end px-4">
              <button
                onClick={() => setHelpOpen(false)}
                className="w-10 h-10 flex items-center justify-center"
                aria-label="닫기"
              >
                <X size={20} className="text-[#222222]" />
              </button>
            </div>
            <div className="px-4 pb-9 flex flex-col gap-6">
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
              className="w-full py-5 bg-[#31C678] text-white text-[20px] font-medium font-noto"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-[#222222]/90 rounded-full text-white text-[14px] font-pretendard whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
