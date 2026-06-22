"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_NAME_LENGTH = 10;
const STEPS = ["팀선택", "닉네임"] as const;

interface Team {
  id: string;
  name: string;
  member_count: number;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/v1/teams")
      .then((r) => r.json())
      .then((data: { teams: Team[] }) =>
        setTeams((data.teams ?? []).sort((a, b) => a.name.localeCompare(b.name, "ko")))
      );
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isNameTooLong = name.length > MAX_NAME_LENGTH;
  const canComplete = name.trim().length > 0 && !isNameTooLong;

  async function handleComplete() {
    if (!selectedTeam || !canComplete) return;
    setIsSubmitting(true);
    setErrorMessage("");
    const isFirstMember = selectedTeam.member_count === 0;
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: name.trim(), team_id: selectedTeam.id }),
    });
    setIsSubmitting(false);
    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.message ?? "회원가입에 실패했습니다.");
      return;
    }
    // 이미 있는 닉네임이면 자동 로그인 → 바로 홈으로
    if (!data.is_new) {
      router.push("/");
      return;
    }
    // 신규 가입
    if (isFirstMember) {
      router.push(`/select-theme?team_id=${selectedTeam.id}`);
    } else {
      setStep(3);
    }
  }

  if (step === 3) {
    return (
      <div className="flex flex-col h-dvh bg-white">
        <div className="h-11" />
        <div className="h-[62px]" />
        <div className="flex-1 flex flex-col justify-between px-4 pb-safe">
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <h1 className="text-[24px] font-bold leading-[32px] tracking-[-3%] text-[#222222] text-center font-noto whitespace-pre-line">
              {"회원가입이\n완료되었습니다!"}
            </h1>
            <p className="text-[16px] font-normal leading-[24px] tracking-[-3%] text-[#F32F15] text-center font-noto whitespace-pre-line">
              {"다른 기기에서 미션 참여할 시 기록이 사라집니다"}
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

      {/* AppBar */}
      <div className="h-[62px]" />

      {/* 본문 */}
      <div className="flex-1 flex flex-col justify-between px-4 pb-safe">
        <div className="flex flex-col gap-6 pt-4">
          {/* 타이틀 + 스텝 인디케이터 */}
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-[30px] font-bold leading-[100%] tracking-[-3%] text-[#222222] font-noto text-center">
              {step === 1 ? "팀 선택" : "닉네임 작성"}
            </h1>

            <div className="flex items-start">
              {STEPS.map((label, i) => {
                const isActive = step === i + 1;
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

          {/* 부제목 */}
          <p className="text-[18px] font-normal leading-[24px] tracking-[-3%] text-[#222222] text-center font-noto">
            {step === 1
              ? "소속된 팀을 선택해 주세요!"
              : "사용할 닉네임을 작성해 주세요!"}
          </p>

          {/* Step 1: 팀 드롭다운 */}
          {step === 1 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="w-full h-[54px] px-4 rounded-[8px] border border-[#DDDDDD] flex items-center justify-between text-[18px] font-normal font-noto"
              >
                <span className={selectedTeam ? "text-[#222222]" : "text-[#AAAAAA]"}>
                  {selectedTeam?.name ?? "팀 선택"}
                </span>
                <ChevronDown size={20} className="text-[#222222] shrink-0" />
              </button>
              {dropdownOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[#DDDDDD] rounded-[8px] z-10 shadow-sm overflow-hidden">
                  <div className="max-h-[220px] overflow-y-auto overscroll-contain">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => {
                          setSelectedTeam(team);
                          setDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-3 text-left text-[18px] font-normal font-noto transition-colors",
                          selectedTeam?.id === team.id
                            ? "bg-[#F6FEF8] text-[#46AE78]"
                            : "text-[#222222] active:bg-[#F5F5F5]"
                        )}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: 닉네임 입력 */}
          {step === 2 && (
            <div className="flex flex-col gap-[10px]">
              <input
                autoFocus
                type="text"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(e) => setName(e.target.value)}
                placeholder="닉네임을 작성해 주세요"
                className={cn(
                  "w-full h-[54px] px-4 rounded-[8px] border text-[18px] font-normal outline-none font-noto placeholder:text-[#AAAAAA] text-[#222222]",
                  isNameTooLong ? "border-[#F32F15]" : "border-[#DDDDDD] focus:border-[#46AE78]"
                )}
              />
              <p className={cn(
                "text-[14px] font-normal leading-[100%] tracking-[-3%] font-noto",
                isNameTooLong ? "text-[#F32F15]" : "text-[#AAAAAA]"
              )}>
                최대 {MAX_NAME_LENGTH}자까지 사용 가능합니다.
              </p>
              {errorMessage && (
                <p className="text-[14px] text-[#F32F15] font-noto">{errorMessage}</p>
              )}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className={cn("pt-4", step === 2 && "flex gap-[10px]")}>
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="w-[111px] h-[54px] rounded-[8px] bg-[#F5F5F5] text-[#666666] text-[20px] font-medium shrink-0 font-noto"
            >
              이전
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!selectedTeam || teams.length === 0}
              className={cn(
                "w-full h-[54px] rounded-[8px] text-[20px] font-medium transition-colors font-noto",
                selectedTeam && teams.length > 0
                  ? "bg-[#31C678] text-white"
                  : "bg-[#F5F5F5] text-[#666666]"
              )}
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canComplete || isSubmitting}
              className={cn(
                "flex-1 h-[54px] rounded-[8px] text-[20px] font-medium transition-colors font-noto",
                canComplete && !isSubmitting
                  ? "bg-[#31C678] text-white"
                  : "bg-[#F5F5F5] text-[#666666]"
              )}
            >
              {isSubmitting ? "처리 중..." : "완료"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
