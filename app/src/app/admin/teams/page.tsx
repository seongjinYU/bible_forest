"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { THEMES } from "@/constants/themes";
import type { ThemeKey } from "@/constants/themes";

interface Team {
  id: string;
  name: string;
  theme: ThemeKey;
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams]     = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/teams");
    if (res.status === 403) { router.replace("/admin"); return; }
    if (!res.ok) { setError("팀을 불러오지 못했습니다."); setLoading(false); return; }
    const data = await res.json();
    setTeams(data.teams ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    const res = await fetch("/api/v1/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? "팀 추가에 실패했습니다.");
      return;
    }
    setNewName("");
    await load();
  }

  async function deleteTeam(id: string) {
    if (!confirm("팀을 삭제하시겠습니까?")) return;
    setError("");
    const res = await fetch(`/api/v1/admin/teams/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? "팀 삭제에 실패했습니다.");
      return;
    }
    await load();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-noto">팀 관리</h2>
          <p className="text-sm text-gray-500 mt-0.5 font-pretendard">팀을 추가하거나 삭제할 수 있습니다 (숲 테마는 표시 전용)</p>
        </div>

        <form onSubmit={addTeam} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="팀 이름"
            className="h-10 px-3 rounded-xl border border-gray-200 focus:border-[#31C678] outline-none text-[14px] w-28 font-pretendard"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#31C678] text-white text-[14px] font-medium disabled:bg-gray-200 disabled:text-gray-400 transition-colors font-pretendard"
          >
            <Plus size={15} />
            추가
          </button>
        </form>
      </div>

      {error && <p className="mb-4 text-sm text-red-500 font-pretendard">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 font-pretendard">불러오는 중...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <p className="text-[15px] font-pretendard">등록된 팀이 없습니다</p>
            </div>
          )}
          {teams.map((team) => {
            const themeInfo = THEMES[team.theme] ?? THEMES.forest;
            return (
              <div key={team.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl shrink-0 border border-gray-100"
                    style={{ background: themeInfo.pageBackground }}
                  />
                  <span className="text-[15px] font-semibold text-gray-900 font-noto">{team.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* 숲 테마는 표시 전용 (변경 불가) */}
                  <span className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] border border-gray-100 bg-gray-50 text-gray-500 font-pretendard">
                    {themeInfo.icon} {themeInfo.label}
                  </span>
                  <button
                    onClick={() => deleteTeam(team.id)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-300 hover:bg-red-50 hover:border-red-200 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
