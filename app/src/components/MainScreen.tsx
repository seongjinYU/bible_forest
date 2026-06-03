"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, X, Download, Link2 } from "lucide-react";
import { THEMES, THEME_STORAGE_KEY } from "@/constants/themes";
import type { ThemeKey } from "@/constants/themes";

interface MainScreenProps {
  name: string;
  team: string;
}

const MOCK_STATS = { trees: 234, score: 532, participants: 32 };

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

export default function MainScreen({ name, team }: MainScreenProps) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [randomOpen, setRandomOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("forest");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey | null;
    if (saved && THEMES[saved]) setTheme(saved);
  }, []);

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

  const currentTheme = THEMES[theme];

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: currentTheme.gradient }}
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
            <Upload size={22} className="text-[#222222]" />
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="w-[26px] h-[26px] flex items-center justify-center"
            aria-label="도움말"
          >
            <AlertCircle size={22} className="text-[#222222]" />
          </button>
        </div>
      </div>

      {/* 유저 정보 */}
      <div className="px-6 pt-2 pb-2 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[24px] font-bold leading-none text-[#222222] font-pretendard">{name}</span>
            <span className="text-[16px] text-[#999999] font-pretendard">{team}</span>
          </div>
          <p className="text-[16px] text-[#222222] font-pretendard">팀 영혼들과 함께 나무를 심어보세요!</p>
        </div>
        <button
          onClick={() => router.push("/reading")}
          className="shrink-0 h-[34px] px-[14px] rounded-[20px] border border-[#222222] text-[#222222] text-[14px] font-pretendard"
        >
          내 인증 현황
        </button>
      </div>

      {/* 숲 영역 */}
      <div className="flex-1 relative">
        {/* 인증 말풍선 */}
        <button
          onClick={() => router.push("/reading")}
          className="absolute bottom-[88px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 h-[45px] bg-[#222222] rounded-full text-white text-[13px] font-pretendard whitespace-nowrap"
        >
          <span>👉</span>
          <span>
            <span className="font-semibold">클릭</span>해서{" "}
            <span className="font-semibold">인증</span>해보세요!
          </span>
        </button>

        {/* 재생 버튼 */}
        <button
          className="absolute bottom-8 left-6 w-6 h-6 rounded-full bg-[#FFAE00] flex items-center justify-center"
          aria-label="재생"
        >
          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-white ml-0.5" />
        </button>
      </div>

      {/* 하단 정보 */}
      <div className="px-6 pb-9 flex flex-col gap-3">
        {/* 통계 카드 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[12px] px-4 py-4 flex flex-col gap-2">
          <p className="text-[16px] text-[#222222] font-pretendard">현재 우리 숲은?</p>
          <div className="flex items-center gap-[3px]">
            <span className="text-[24px] font-semibold text-[#222222] font-pretendard">{MOCK_STATS.trees}</span>
            <span className="text-[24px] text-[#222222] font-pretendard">그루</span>
            <div className="w-1 h-1 rounded-full bg-[#2E9200] mx-[5px]" />
            <span className="text-[24px] font-semibold text-[#222222] font-pretendard">{MOCK_STATS.score}</span>
            <span className="text-[24px] text-[#222222] font-pretendard">점</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[20px] text-[#222222] font-pretendard">참여중</span>
              <span className="text-[20px] font-semibold text-[#222222] font-pretendard">{MOCK_STATS.participants}</span>
              <span className="text-[20px] text-[#222222] font-pretendard">명</span>
            </div>
            <button className="w-[76px] h-[34px] rounded-[20px] bg-[#2E9200] text-white text-[14px] font-pretendard">
              초대하기
            </button>
          </div>
        </div>

        {/* 다른 숲 */}
        <button
          onClick={() => router.push("/forests")}
          className="w-full h-[48px] rounded-[8px] bg-white text-[#222222] text-[16px] font-pretendard"
        >
          다른 숲 구경하러 가기
        </button>
      </div>

      {/* Popup_share */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[358px] bg-white rounded-[8px] overflow-hidden">
            {/* 헤더 */}
            <div className="h-[50px] flex items-center justify-end px-4">
              <button
                onClick={() => setShareOpen(false)}
                className="w-10 h-10 flex items-center justify-center"
                aria-label="닫기"
              >
                <X size={20} className="text-[#222222]" />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="px-4 pb-9 pt-6 flex flex-col items-center gap-6">
              {/* 타이틀 */}
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-[20px] font-medium leading-[28px] tracking-[-0.03em] text-[#222222] text-center font-noto">
                  함께 하고 싶은 영혼에게 공유해보세요!
                </h2>
                <p className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto">
                  팀 영혼들과 서로 독려하며 함께 해요!
                </p>
              </div>

              {/* 버튼 3개 */}
              <div className="flex items-start gap-6">
                {/* 이미지 다운로드 */}
                <button className="flex flex-col items-center gap-4 w-20">
                  <div className="w-20 h-20 rounded-full bg-[#31C678] flex items-center justify-center">
                    <Download size={32} className="text-white" />
                  </div>
                  <span className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto whitespace-pre-line">
                    {"이미지\n다운로드"}
                  </span>
                </button>

                {/* 카카오톡 공유 */}
                <button className="flex flex-col items-center gap-4 w-20">
                  <div className="w-20 h-20 rounded-full bg-[#FFEB00] flex items-center justify-center">
                    <span className="text-[28px] font-bold text-[#3B1D26] font-pretendard leading-none">K</span>
                  </div>
                  <span className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto whitespace-pre-line">
                    {"카카오톡\n공유"}
                  </span>
                </button>

                {/* 링크 복사 */}
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

      {/* Popup_random — Figma API rate limit으로 미구현, 피그마 디자인 확인 후 업데이트 필요 */}
      {randomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[358px] bg-white rounded-[8px] overflow-hidden">
            <div className="h-[50px] flex items-center justify-end px-4">
              <button
                onClick={() => setRandomOpen(false)}
                className="w-10 h-10 flex items-center justify-center"
                aria-label="닫기"
              >
                <X size={20} className="text-[#222222]" />
              </button>
            </div>
            <div className="px-4 pb-9 pt-4 flex flex-col items-center gap-4">
              <p className="text-[20px] font-medium font-noto text-[#222222] text-center">
                랜덤 나무 획득!
              </p>
              <p className="text-[16px] font-normal font-noto text-[#666666] text-center">
                (Figma 디자인 확인 후 업데이트 예정)
              </p>
            </div>
            <button
              onClick={() => setRandomOpen(false)}
              className="w-full py-5 bg-[#31C678] text-white text-[20px] font-medium font-noto"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Popup_info */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[358px] bg-white rounded-[8px] overflow-hidden">
            {/* 헤더 */}
            <div className="h-[50px] flex items-center justify-end px-4">
              <button
                onClick={() => setHelpOpen(false)}
                className="w-10 h-10 flex items-center justify-center"
                aria-label="닫기"
              >
                <X size={20} className="text-[#222222]" />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="px-4 pb-9 flex flex-col gap-6">
              {/* 타이틀 */}
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-[20px] font-medium leading-[28px] tracking-[-0.03em] text-[#222222] text-center font-noto">
                  성경읽기 인증하고 나무를 심어보세요!
                </h2>
                <p className="text-[16px] font-normal leading-[24px] tracking-[-0.03em] text-[#666666] text-center font-noto">
                  게임 참여 방법 안내
                </p>
              </div>

              {/* 번호 아이템 */}
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

            {/* 확인 버튼 */}
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
