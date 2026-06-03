"use client";

import { Users, Trees, BookOpen, TrendingUp } from "lucide-react";

const TEAM_STATS = [
  { name: "1팀", participants: 14, chapters: 213, trees: 48, progress: 82 },
  { name: "2팀", participants: 11, chapters: 163, trees: 35, progress: 63 },
  { name: "3팀", participants: 9,  chapters: 114, trees: 27, progress: 44 },
  { name: "4팀", participants: 16, chapters: 254, trees: 61, progress: 98 },
  { name: "5팀", participants: 7,  chapters: 80,  trees: 19, progress: 31 },
  { name: "6팀", participants: 10, chapters: 133, trees: 33, progress: 51 },
  { name: "7팀", participants: 13, chapters: 197, trees: 44, progress: 76 },
];

const MEMBER_STATS = [
  { name: "홍길동", team: "1팀", chapters: 130, trees: 13 },
  { name: "김철수", team: "4팀", chapters: 110, trees: 11 },
  { name: "이영희", team: "7팀", chapters: 97,  trees: 9  },
  { name: "박지민", team: "2팀", chapters: 87,  trees: 8  },
  { name: "최예린", team: "1팀", chapters: 83,  trees: 8  },
  { name: "정민준", team: "4팀", chapters: 74,  trees: 7  },
  { name: "강수진", team: "3팀", chapters: 60,  trees: 6  },
  { name: "윤서연", team: "6팀", chapters: 53,  trees: 5  },
];

const totalParticipants = TEAM_STATS.reduce((s, t) => s + t.participants, 0);
const totalTrees        = TEAM_STATS.reduce((s, t) => s + t.trees, 0);
const totalChapters     = TEAM_STATS.reduce((s, t) => s + t.chapters, 0);
const avgProgress       = Math.round(TEAM_STATS.reduce((s, t) => s + t.progress, 0) / TEAM_STATS.length);

const SUMMARY = [
  { label: "전체 참여 인원", value: `${totalParticipants}명`, icon: Users,      color: "text-blue-500",   bg: "bg-blue-50"   },
  { label: "총 나무 수",     value: `${totalTrees}그루`,       icon: Trees,      color: "text-green-500",  bg: "bg-green-50"  },
  { label: "총 읽은 장 수", value: `${totalChapters}장`,      icon: BookOpen,   color: "text-amber-500",  bg: "bg-amber-50"  },
  { label: "평균 진도율",   value: `${avgProgress}%`,          icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
];

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-noto">전체 현황</h2>
        <p className="text-sm text-gray-500 mt-0.5 font-pretendard">2026 신약 1독 챌린지 진행 현황</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SUMMARY.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex flex-col gap-2">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={`text-xl font-bold font-pretendard ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-pretendard">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 팀별 진도율 */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5">
        <h3 className="font-bold text-gray-800 text-[15px] mb-4 font-noto">팀별 진도율</h3>
        <div className="flex flex-col gap-3">
          {[...TEAM_STATS].sort((a, b) => b.progress - a.progress).map((t) => (
            <div key={t.name} className="flex items-center gap-3">
              <span className="w-8 text-[13px] font-medium text-gray-600 shrink-0 font-pretendard">{t.name}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#31C678] transition-all" style={{ width: `${t.progress}%` }} />
              </div>
              <div className="flex items-center gap-3 shrink-0 w-40">
                <span className="text-[13px] font-semibold text-[#31C678] w-10 text-right font-pretendard">{t.progress}%</span>
                <span className="text-[12px] text-gray-400 font-pretendard">🌲 {t.trees}그루 · {t.participants}명</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 개인별 인증 현황 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-800 text-[15px] font-noto">개인별 인증 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {["순위", "이름", "팀", "읽은 장", "나무"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[12px] text-gray-400 font-medium font-pretendard">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEMBER_STATS.map((m, i) => (
                <tr key={m.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`text-[13px] font-bold font-pretendard ${i < 3 ? "text-[#31C678]" : "text-gray-300"}`}>{i + 1}</span>
                  </td>
                  <td className="px-5 py-3 text-[14px] font-medium text-gray-800 font-pretendard">{m.name}</td>
                  <td className="px-5 py-3 text-[13px] text-gray-500 font-pretendard">{m.team}</td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 font-pretendard">{m.chapters}장</td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 font-pretendard">🌲 {m.trees}그루</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
