"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEAMS } from "@/constants/teams";

const MAX_NAME_LENGTH = 10;

const STEPS = ["팀선택", "이름"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState<"idle" | "confirmed">("idle");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isNameTooLong = name.length > MAX_NAME_LENGTH;

  function handleNameChange(value: string) {
    setName(value);
    if (nameStatus === "confirmed") setNameStatus("idle");
  }

  function handleNameCheck() {
    if (!name.trim() || isNameTooLong) return;
    setNameStatus("confirmed");
  }

  function handleComplete() {
    setShowConfirmModal(true);
  }

  function handleConfirm() {
    const value = JSON.stringify({ name: name.trim(), team: selectedTeam });
    document.cookie = `user=${encodeURIComponent(value)}; max-age=7776000; path=/; SameSite=Lax`;
    setShowConfirmModal(false);
    setStep(3);
  }

  if (step === 3) {
    return (
      <div className="flex flex-col h-full min-h-screen bg-white">
        <div className="h-11" />
        <div className="flex-1 flex flex-col justify-between px-4 pb-9 pt-4">
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <h1 className="text-[24px] font-medium leading-[30px] tracking-[-3%] text-[#222222] text-center font-noto whitespace-pre-line">
              {"회원가입이\n완료되었습니다!"}
            </h1>
            <p className="text-[16px] font-normal leading-[24px] tracking-[-3%] text-[#F32F15] text-center font-noto whitespace-pre-line">
              {"앱을 삭제하면 미션에 참여한 데이터가 사라집니다!\n주의 부탁드립니다!"}
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
    <div className="flex flex-col h-full min-h-screen bg-white">
      {/* 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm bg-white rounded-[12px] overflow-hidden">
            <div className="flex flex-col gap-[24px] px-4 pt-6 pb-9">
              {/* 헤더 */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="w-8 h-8 flex items-center justify-center"
                    aria-label="닫기"
                  >
                    <X size={20} className="text-[#222222]" />
                  </button>
                </div>
                <div className="flex flex-col gap-2 items-center">
                  <h2 className="text-[20px] font-medium leading-[28px] tracking-[-3%] text-[#222222] text-center font-noto">
                    입력하신 정보로 가입을 진행할까요?
                  </h2>
                  <p className="text-[16px] font-normal leading-[24px] tracking-[-3%] text-[#666666] text-center font-noto whitespace-pre-line">
                    {"팀과 이름을 정확히 입력하셨는지\n다시 한번 확인해 주세요."}
                  </p>
                </div>
              </div>

              {/* 정보 박스 */}
              <div className="border border-[#DDDDDD] rounded-[8px] px-6 py-6 flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <span className="w-[34px] text-[18px] font-normal text-[#888888] font-noto shrink-0">팀</span>
                  <span className="text-[18px] font-normal text-[#222222] font-noto">{selectedTeam}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-[34px] text-[18px] font-normal text-[#888888] font-noto shrink-0">이름</span>
                  <span className="text-[18px] font-normal text-[#222222] font-noto">{name.trim()}</span>
                </div>
              </div>
            </div>

            {/* 확인 버튼 */}
            <button
              onClick={handleConfirm}
              className="w-full h-[54px] bg-[#31C678] text-white text-[20px] font-medium font-noto"
            >
              확인
            </button>
          </div>
        </div>
      )}
      <div className="h-11" />

      {/* AppBar */}
      <div className="h-[62px] flex items-center px-4 bg-white">
        {step === 2 ? (
          <button
            onClick={() => setStep(1)}
            className="w-10 h-10 flex items-center justify-center"
            aria-label="뒤로가기"
          >
            <ChevronLeft size={24} className="text-[#222222]" />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 flex flex-col justify-between px-4 pb-9">
        <div className="flex flex-col gap-6 pt-4">
          {/* 타이틀 + 스텝 인디케이터 */}
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-[30px] font-bold leading-[100%] tracking-[-3%] text-[#222222] font-noto text-center">
              {step === 1 ? "기관 선택" : "이름"}
            </h1>

            {/* 스텝 인디케이터 */}
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
              ? "소속된 예배당(기관)을 선택해 주세요!"
              : "이름을 입력해 주세요!"}
          </p>

          {/* Step 1: 팀 배지 그리드 */}
          {step === 1 && (
            <div className="flex flex-wrap justify-center gap-[15px]">
              {TEAMS.map((team) => (
                <button
                  key={team}
                  onClick={() => setSelectedTeam(team)}
                  className={cn(
                    "px-4 py-3 rounded-[8px] border text-[18px] font-normal font-noto transition-colors",
                    selectedTeam === team
                      ? "bg-[#F6FEF8] border-[#46AE78] text-[#222222]"
                      : "bg-white border-[#DDDDDD] text-[#222222]"
                  )}
                >
                  {team}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: 이름 입력 */}
          {step === 2 && (
            <div className="flex flex-col gap-[14px]">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="이름을 입력해 주세요"
                  className={cn(
                    "flex-1 h-[54px] px-4 rounded-[8px] border text-[18px] font-normal outline-none font-noto",
                    "border-[#DDDDDD] text-[#222222] placeholder:text-[#AAAAAA] focus:border-[#46AE78]"
                  )}
                />
                <button
                  onClick={handleNameCheck}
                  disabled={!name.trim() || isNameTooLong}
                  className={cn(
                    "w-[111px] h-[54px] rounded-[8px] text-[18px] font-normal text-white font-noto shrink-0 transition-colors",
                    name.trim() && !isNameTooLong ? "bg-[#333333]" : "bg-[#AAAAAA]"
                  )}
                >
                  확인
                </button>
              </div>
              {isNameTooLong ? (
                <p className="text-[14px] font-normal leading-[100%] tracking-[-3%] text-[#F32F15] font-noto">
                  최대 {MAX_NAME_LENGTH}자를 입력해 주세요.
                </p>
              ) : !name.trim() ? (
                <p className="text-[14px] font-normal leading-[100%] tracking-[-3%] text-[#999999] font-noto">
                  최대 {MAX_NAME_LENGTH}자를 입력해 주세요.
                </p>
              ) : nameStatus === "confirmed" ? (
                <p className="text-[14px] font-normal leading-[100%] tracking-[-3%] text-[#007AD3] font-noto">
                  확인되었습니다.
                </p>
              ) : (
                <p className="text-[14px] font-normal leading-[100%] tracking-[-3%] text-[#999999] font-noto">
                  확인버튼을 눌러주세요.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-[10px] pt-4">
          <button
            onClick={() => step === 2 && setStep(1)}
            disabled={step === 1}
            className="w-[111px] h-[54px] rounded-[8px] bg-[#F5F5F5] text-[#666666] text-[20px] font-medium shrink-0 font-noto"
          >
            이전
          </button>

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!selectedTeam}
              className={cn(
                "flex-1 h-[54px] rounded-[8px] text-[20px] font-medium transition-colors font-noto",
                selectedTeam
                  ? "bg-[#31C678] text-white"
                  : "bg-[#F5F5F5] text-[#666666]"
              )}
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={nameStatus !== "confirmed"}
              className={cn(
                "flex-1 h-[54px] rounded-[8px] text-[20px] font-medium transition-colors font-noto",
                nameStatus === "confirmed"
                  ? "bg-[#31C678] text-white"
                  : "bg-[#F5F5F5] text-[#666666]"
              )}
            >
              완료
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
