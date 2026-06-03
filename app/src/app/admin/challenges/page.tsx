"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, StopCircle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

const STORAGE_KEY = "admin_challenges";

const DEFAULT_CHALLENGES: Challenge[] = [
  { id: "1", name: "2026 신약 1독 챌린지", startDate: "2026-06-01", endDate: "2026-08-15", active: true },
];

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Challenge | null>(null);
  const [form, setForm]             = useState({ name: "", startDate: "", endDate: "" });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    setChallenges(raw ? JSON.parse(raw) : DEFAULT_CHALLENGES);
  }, []);

  function save(updated: Challenge[]) {
    setChallenges(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", startDate: "", endDate: "" });
    setModalOpen(true);
  }

  function openEdit(c: Challenge) {
    setEditing(c);
    setForm({ name: c.name, startDate: c.startDate, endDate: c.endDate });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      save(challenges.map((c) => c.id === editing.id ? { ...c, ...form } : c));
    } else {
      save([...challenges, { id: Date.now().toString(), ...form, active: false }]);
    }
    setModalOpen(false);
  }

  function toggleActive(id: string) {
    save(challenges.map((c) => c.id === id ? { ...c, active: !c.active } : c));
  }

  function deleteChallenge(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    save(challenges.filter((c) => c.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-noto">챌린지 관리</h2>
          <p className="text-sm text-gray-500 mt-0.5 font-pretendard">챌린지를 추가하고 상태를 관리하세요</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#31C678] text-white text-[14px] font-medium font-pretendard"
        >
          <Plus size={16} />
          새 챌린지
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {challenges.length === 0 && (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <p className="text-[15px] font-pretendard">등록된 챌린지가 없습니다</p>
          </div>
        )}
        {challenges.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full font-medium font-pretendard",
                    c.active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", c.active ? "bg-green-500" : "bg-gray-300")} />
                  {c.active ? "진행중" : "종료"}
                </span>
                <h3 className="font-semibold text-gray-900 text-[15px] truncate font-noto">{c.name}</h3>
              </div>
              <p className="text-[13px] text-gray-400 font-pretendard">{c.startDate} ~ {c.endDate}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(c.id)}
                className={cn(
                  "flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] border transition-colors font-pretendard",
                  c.active ? "border-red-200 text-red-500 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"
                )}
              >
                <StopCircle size={13} />
                {c.active ? "종료" : "재개"}
              </button>
              <button onClick={() => openEdit(c)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={() => deleteChallenge(c.id)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:border-red-200 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 font-noto">{editing ? "챌린지 수정" : "새 챌린지 추가"}</h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 font-pretendard">챌린지 이름</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="예: 2026 신약 1독 챌린지"
                  className="h-11 px-3 rounded-xl border border-gray-200 focus:border-[#31C678] outline-none text-[14px] font-pretendard"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 font-pretendard">시작일</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="h-11 px-3 rounded-xl border border-gray-200 focus:border-[#31C678] outline-none text-[14px] font-pretendard"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 font-pretendard">종료일</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="h-11 px-3 rounded-xl border border-gray-200 focus:border-[#31C678] outline-none text-[14px] font-pretendard"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-500 text-[14px] font-pretendard">
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!form.name || !form.startDate || !form.endDate}
                  className="flex-1 h-11 rounded-xl bg-[#31C678] text-white text-[14px] font-medium disabled:bg-gray-200 disabled:text-gray-400 transition-colors font-pretendard"
                >
                  {editing ? "수정 완료" : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
