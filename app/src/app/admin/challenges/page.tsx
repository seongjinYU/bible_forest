"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, StopCircle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function ChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Challenge | null>(null);
  const [form, setForm]             = useState({ name: "", start_date: "", end_date: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/challenges");
    if (res.status === 403) { router.replace("/admin"); return; }
    if (!res.ok) { setError("챌린지를 불러오지 못했습니다."); setLoading(false); return; }
    const data = await res.json();
    setChallenges(data.challenges ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", start_date: "", end_date: "" });
    setModalOpen(true);
  }

  function openEdit(c: Challenge) {
    setEditing(c);
    setForm({ name: c.name, start_date: c.start_date, end_date: c.end_date });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = editing
      ? await fetch(`/api/v1/admin/challenges/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await fetch("/api/v1/admin/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? "저장에 실패했습니다.");
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function toggleActive(c: Challenge) {
    setError("");
    const res = await fetch(`/api/v1/admin/challenges/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? "상태 변경에 실패했습니다.");
      return;
    }
    await load();
  }

  async function deleteChallenge(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setError("");
    const res = await fetch(`/api/v1/admin/challenges/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? "삭제에 실패했습니다.");
      return;
    }
    await load();
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

      {error && <p className="mb-4 text-sm text-red-500 font-pretendard">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 font-pretendard">불러오는 중...</p>
      ) : (
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
                      c.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", c.is_active ? "bg-green-500" : "bg-gray-300")} />
                    {c.is_active ? "진행중" : "종료"}
                  </span>
                  <h3 className="font-semibold text-gray-900 text-[15px] truncate font-noto">{c.name}</h3>
                </div>
                <p className="text-[13px] text-gray-400 font-pretendard">{c.start_date} ~ {c.end_date}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(c)}
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] border transition-colors font-pretendard",
                    c.is_active ? "border-red-200 text-red-500 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"
                  )}
                >
                  <StopCircle size={13} />
                  {c.is_active ? "종료" : "활성화"}
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
      )}

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
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="h-11 px-3 rounded-xl border border-gray-200 focus:border-[#31C678] outline-none text-[14px] font-pretendard"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 font-pretendard">종료일</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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
                  disabled={!form.name || !form.start_date || !form.end_date}
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
