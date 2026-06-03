"use client";

import { useRouter } from "next/navigation";
import AppBar from "@/components/AppBar";

const MOCK_TEAMS = [
  { name: "1팀", trees: 48, participants: 14, progress: 82 },
  { name: "2팀", trees: 35, participants: 11, progress: 63 },
  { name: "3팀", trees: 27, participants: 9,  progress: 44 },
  { name: "4팀", trees: 61, participants: 16, progress: 98 },
  { name: "5팀", trees: 19, participants: 7,  progress: 31 },
  { name: "6팀", trees: 33, participants: 10, progress: 55 },
  { name: "7팀", trees: 44, participants: 13, progress: 76 },
];

export default function ForestsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
      <div className="h-11 bg-[#31C678]" />

      <AppBar
        title="다른 팀 숲 보기"
        onBack={() => router.back()}
        className="bg-[#31C678] text-white [&_svg]:text-white"
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {MOCK_TEAMS.map((team) => (
          <div
            key={team.name}
            className="bg-white rounded-[12px] overflow-hidden"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
          >
            {/* 숲 미리보기 */}
            <div
              className="relative h-[100px] flex items-end px-4 pb-3"
              style={{ background: "linear-gradient(to bottom, #2D6A4F, #95D5B2)" }}
            >
              <div className="flex flex-wrap gap-1 pointer-events-none">
                {Array.from({ length: Math.round(team.progress / 10) }).map((_, i) => (
                  <span key={i} className="text-lg">🌲</span>
                ))}
              </div>
            </div>

            {/* 팀 정보 */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[16px] font-semibold text-[#222222] font-noto">{team.name}</p>
                <p className="text-[13px] text-[#666666] mt-0.5 font-pretendard">참여 {team.participants}명</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">🌲</span>
                <span className="text-[16px] font-semibold text-[#31C678] font-pretendard">{team.trees}그루</span>
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="mx-4 mb-3 h-1.5 rounded-full bg-[#F5F5F5] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#31C678]"
                style={{ width: `${team.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
