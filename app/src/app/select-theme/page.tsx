"use client";

import { Fragment, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const STEPS = ["팀선택", "닉네임", "테마선택"] as const;

const THEMES = [
  {
    id: "forest" as const,
    image: "/assets/forest/theme.png",
    label: "말씀의 숲",
  },
  {
    id: "night" as const,
    image: "/assets/night/theme.png",
    label: "빛의 하늘",
  },
  {
    id: "ocean" as const,
    image: "/assets/ocean/theme.png",
    label: "생명의 바다",
  },
];

type ThemeId = (typeof THEMES)[number]["id"];

function SelectThemeContent() {
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
            onClick={() => { window.location.href = "/"; }}
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

      <div className="flex-1 flex flex-col justify-between px-5 pb-safe">
        <div className="flex flex-col gap-8 pt-4">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-[30px] font-bold leading-[100%] tracking-[-3%] text-[#222222] font-noto text-center">
              테마 선택
            </h1>
            <div className="flex items-start">
              {STEPS.map((label, i) => {
                const isActive = i === 2;
                return (
                  <Fragment key={i}>
                    {i > 0 && (
                      <div className="w-[59px] h-px bg-[#DBEDED] mt-[10px] shrink-0" />
                    )}
                    <div className="w-[51px] flex flex-col items-center gap-4">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center",
                        isActive ? "bg-[#19CDCD]" : "bg-white border border-[#7BDBDB]"
                      )}>
                        <div className={cn(
                          "w-1 h-1 rounded-full",
                          isActive ? "bg-white" : "bg-[#7BDBDB]"
                        )} />
                      </div>
                      <span className={cn(
                        "text-[14px] font-normal leading-[100%] tracking-[-3%] font-noto",
                        isActive ? "text-[#222222]" : "text-[#AAAAAA]"
                      )}>
                        {label}
                      </span>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[18px] font-normal leading-[24px] tracking-[-3%] text-[#222222] text-center font-noto">
              팀에서 사용할 테마를 선택해 주세요!
            </p>
            <p className="text-[14px] font-medium text-[#F32F15] text-center font-noto">
              한 번 선택하면 변경할 수 없습니다!
            </p>
          </div>

          <div className="flex flex-row items-start justify-center gap-3">
            {THEMES.map((theme) => {
              const isSelected = selected === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelected(theme.id)}
                  className="flex flex-col items-center gap-3 flex-1"
                >
                  <div
                    className={cn(
                      "w-full aspect-square rounded-full transition-all",
                      isSelected && "ring-[3px] ring-[#19CDCD]",
                    )}
                  >
                    <img
                      src={theme.image}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <p className="text-[13px] text-center text-[#333333] font-noto leading-[1.6]">
                    {theme.label}
                  </p>
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
                : "bg-[#F5F5F5] text-[#666666]",
            )}
          >
            {isSubmitting ? "저장 중..." : "선택완료"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SelectThemePage() {
  return (
    <Suspense fallback={null}>
      <SelectThemeContent />
    </Suspense>
  );
}
