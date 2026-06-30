"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AVATAR_PALETTE } from "@/constants/avatars";

interface Participant {
  nickname: string;
  score: number;
  joinedAt: string;
}

export default function ParticipantsList({
  teamName,
  participants,
}: {
  teamName: string;
  participants: Participant[];
}) {
  const router = useRouter();
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleClose() {
    router.back();
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      <div
        className="flex flex-col h-full"
        style={{
          transform: `translateY(${Math.max(0, dragY)}px)`,
          transition: isDragging ? "none" : "transform 0.25s ease",
        }}
        onTouchStart={(e) => {
          const atTop = (scrollRef.current?.scrollTop ?? 0) === 0;
          dragStartY.current = atTop ? e.touches[0].clientY : null;
          setIsDragging(atTop);
        }}
        onTouchMove={(e) => {
          if (dragStartY.current === null) return;
          const dy = e.touches[0].clientY - dragStartY.current;
          if (dy <= 0) return;
          setDragY(dy);
        }}
        onTouchEnd={() => {
          if (dragY > 100) {
            handleClose();
          } else {
            setDragY(0);
          }
          dragStartY.current = null;
          setIsDragging(false);
        }}
      >
        <div
          className="relative flex items-center justify-center px-4 shrink-0"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)", paddingBottom: 12 }}
        >
          <h1 className="text-[17px] font-semibold font-pretendard text-[#222222]">
            {teamName} 참여중인 인원
          </h1>
          <button onClick={handleClose} aria-label="닫기" className="absolute right-4 p-1">
            <X size={22} className="text-[#222222]" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-safe">
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
                  <p className="text-[13px] font-pretendard text-[#AAAAAA] mt-0.5">{dateLabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
