"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "star", label: "별", emoji: "⭐" },
  { id: "tree", label: "나무", emoji: "🌳" },
  { id: "music", label: "음표", emoji: "🎵" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export default function SelectThemePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("team_id");

  const [selected, setSelected] = useState<ThemeId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [done, setDone] = useState(false);

  async function handleComplete() {
    if (!selected || !teamId) return;
    setIsSubmitting(true);
    setErrorMessage("");
    const res = await fetch(`/api/v1/teams/${teamId}/theme`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: selected }),
    });
    setIsSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setErrorMessage(data.message ?? "테마 저장에 실패했습니다.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col h-dvh bg-white">
        <div className="h-11" />
        <div className="h-[62px]" />
        <div className="flex-1 flex flex-col justify-between px-4 pb-safe">
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <h1 className="text-[24px] font-bold leading-[32px] tracking-[-3%] text-[#222222] text-center font-noto whitespace-pre-line">
              {"회원가입이\n완료되었습니다!"}
            </h1>
            <p className="text-[16px] font-normal leading-[24px] tracking-[-3%] text-[#F32F15] text-center font-noto">
              다른 기기에서 미션 참여할 시 기록이 사라집니다
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full h-[54px] rounded-[8px] bg-[#31C678] text-white text-[20px] font-medium font-noto"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      <div className="h-11" />
      <div className="h-[62px]" />

      <div className="flex-1 flex flex-col justify-between px-4 pb-safe">
        <div className="flex flex-col gap-6 pt-4">
          <div className="flex flex-col items-center">
            <h1 className="text-[30px] font-bold leading-[100%] tracking-[-3%] text-[#222222] font-noto text-center">
              테마 선택
            </h1>
          </div>

          <p className="text-[18px] font-normal leading-[24px] tracking-[-3%] text-[#222222] text-center font-noto">
            팀 숲의 테마를 선택해 주세요!
          </p>

          <div className="flex flex-row items-center justify-center gap-4 pt-2">
            {THEMES.map((theme) => {
              const isSelected = selected === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelected(theme.id)}
                  className={cn(
                    "w-[104px] h-[104px] rounded-full border-2 flex flex-col items-center justify-center gap-1 transition-colors",
                    isSelected
                      ? "border-[#19CDCD] bg-[#19CDCD]"
                      : "border-[#19CDCD] bg-[#E8E8E8]"
                  )}
                >
                  <span className="text-[28px] leading-none">{theme.emoji}</span>
                  <span className={cn(
                    "text-[14px] font-medium font-noto",
                    isSelected ? "text-white" : "text-[#555555]"
                  )}>
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>

          {errorMessage && (
            <p className="text-[14px] text-[#F32F15] font-noto text-center">{errorMessage}</p>
          )}
        </div>

        <div className="pt-4">
          <button
            onClick={handleComplete}
            disabled={!selected || isSubmitting}
            className={cn(
              "w-full h-[54px] rounded-[8px] text-[20px] font-medium transition-colors font-noto",
              selected && !isSubmitting
                ? "bg-[#31C678] text-white"
                : "bg-[#F5F5F5] text-[#666666]"
            )}
          >
            {isSubmitting ? "저장 중..." : "선택완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
