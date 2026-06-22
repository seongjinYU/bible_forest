"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Trees, BookOpen, TrendingUp } from "lucide-react";

interface TeamStat {
  team_id: string;
  team_name: string;
  member_count: number;
  chapters_checked: number;
  progress_rate: number;
  tree_count: number;
  total_score: number;
}
interface MemberStat {
  user_id: string;
  nickname: string;
  team_name: string;
  chapters_checked: number;
  tree_count: number;
}
interface DashboardData {
  total_users: number;
  teams: TeamStat[];
  members: MemberStat[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/admin/dashboard")
      .then(async (r) => {
        if (r.status === 403) { router.replace("/admin"); return null; }
        if (!r.ok) throw new Error("불러오기 실패");
        return (await r.json()) as DashboardData;
      })
      .then((d) => { if (active && d) setData(d); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  if (loading) {
    return <p className="text-sm text-gray-400 font-pretendard">불러오는 중...</p>;
  }
  if (failed || !data) {
    return <p className="text-sm text-red-500 font-pretendard">데이터를 불러오지 못했습니다.</p>;
  }

  const { teams, members } = data;
  const totalParticipants = data.total_users;
  const totalTrees    = teams.reduce((s, t) => s + t.tree_count, 0);
  const totalChapters = teams.reduce((s, t) => s + t.chapters_checked, 0);
  const avgProgress   = teams.length
    ? Math.round(teams.reduce((s, t) => s + t.progress_rate, 0) / teams.length)
    : 0;

  const SUMMARY = [
    { label: "전체 참여 인원", value: `${totalParticipants}명`, icon: Users,      color: "text-blue-500",   bg: "bg-blue-50"   },
    { label: "총 나무 수",     value: `${totalTrees}그루`,       icon: Trees,      color: "text-green-500",  bg: "bg-green-50"  },
    { label: "총 읽은 장 수", value: `${totalChapters}장`,      icon: BookOpen,   color: "text-amber-500",  bg: "bg-amber-50"  },
    { label: "평균 진도율",   value: `${avgProgress}%`,          icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-noto">전체 현황</h2>
        <p className="text-sm text-gray-500 mt-0.5 font-pretendard">신약 1독 챌린지 진행 현황</p>
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
        {teams.length === 0 ? (
          <p className="text-sm text-gray-400 font-pretendard">팀 데이터가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...teams].sort((a, b) => b.progress_rate - a.progress_rate).map((t) => (
              <div key={t.team_id} className="flex items-center gap-3">
                <span className="w-8 text-[13px] font-medium text-gray-600 shrink-0 font-pretendard">{t.team_name}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#31C678] transition-all" style={{ width: `${t.progress_rate}%` }} />
                </div>
                <div className="flex items-center gap-3 shrink-0 w-40">
                  <span className="text-[13px] font-semibold text-[#31C678] w-10 text-right font-pretendard">{t.progress_rate}%</span>
                  <span className="text-[12px] text-gray-400 font-pretendard">🌲 {t.tree_count}그루 · {t.member_count}명</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 개인별 인증 현황 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-800 text-[15px] font-noto">개인별 인증 현황</h3>
        </div>
        {members.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400 font-pretendard">참여자가 없습니다.</p>
        ) : (
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
                {members.map((m, i) => (
                  <tr key={m.user_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`text-[13px] font-bold font-pretendard ${i < 3 ? "text-[#31C678]" : "text-gray-300"}`}>{i + 1}</span>
                    </td>
                    <td className="px-5 py-3 text-[14px] font-medium text-gray-800 font-pretendard">{m.nickname}</td>
                    <td className="px-5 py-3 text-[13px] text-gray-500 font-pretendard">{m.team_name}</td>
                    <td className="px-5 py-3 text-[13px] text-gray-700 font-pretendard">{m.chapters_checked}장</td>
                    <td className="px-5 py-3 text-[13px] text-gray-700 font-pretendard">🌲 {m.tree_count}그루</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
