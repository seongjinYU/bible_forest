"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEAMS } from "@/constants/teams";
import { THEMES } from "@/constants/themes";
import type { ThemeKey } from "@/constants/themes";

interface Team {
  id: string;
  name: string;
  theme: ThemeKey;
}

const STORAGE_KEY = "admin_teams";

const DEFAULT_TEAMS: Team[] = TEAMS.map((name, i) => ({
  id: String(i + 1),
  name,
  theme: "tree" as ThemeKey,
}));

export default function TeamsPage() {
  const [teams, setTeams]     = useState<Team[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    setTeams(raw ? JSON.parse(raw) : DEFAULT_TEAMS);
  }, []);

  function save(updated: Team[]) {
    setTeams(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    save([...teams, { id: Date.now().toString(), name: newName.trim(), theme: "tree" as ThemeKey }]);
    setNewName("");
  }

  function setTheme(id: string, theme: ThemeKey) {
    save(teams.map((t) => t.id === id ? { ...t, theme } : t));
  }

  function deleteTeam(id: string) {
    if (!confirm("팀을 삭제하시겠습니까?")) return;
    save(teams.filter((t) => t.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-noto">팀 관리</h2>
          <p className="text-sm text-gray-500 mt-0.5 font-pretendard">팀 목록을 관리하고 숲 테마를 지정하세요</p>
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

      <div className="flex flex-col gap-3">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl shrink-0"
                style={{ background: THEMES[team.theme].pageBackground }}
              />
              <span className="text-[15px] font-semibold text-gray-900 font-noto">{team.name}</span>
            </div>

            <div className="flex items-center gap-2">
              {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setTheme(team.id, key)}
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] border transition-colors font-pretendard",
                    team.theme === key
                      ? "border-[#31C678] bg-[#F6FEF8] text-[#31C678] font-medium"
                      : "border-gray-200 text-gray-400 hover:bg-gray-50"
                  )}
                >
                  {THEMES[key].icon} {THEMES[key].label}
                </button>
              ))}
              <button
                onClick={() => deleteTeam(team.id)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-300 hover:bg-red-50 hover:border-red-200 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
