"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    // 서버에서 ADMIN_PASSWORD 검증 후 httpOnly admin_session 쿠키 발급.
    const res = await fetch("/api/v1/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSubmitting(false);
    if (res.ok) {
      router.push("/admin/dashboard");
    } else {
      setError(true);
      setPassword("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🌲</div>
          <h1 className="text-2xl font-bold text-gray-900 font-noto">팀 숲 관리자</h1>
          <p className="text-sm text-gray-500 mt-1 font-pretendard">관리자 전용 페이지입니다</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 font-pretendard">관리자 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="비밀번호를 입력하세요"
              className={`h-12 px-4 rounded-xl border text-[15px] outline-none transition-colors font-pretendard ${
                error ? "border-red-400" : "border-gray-200 focus:border-[#31C678]"
              }`}
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-500 font-pretendard">비밀번호가 올바르지 않습니다.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!password || submitting}
            className="h-12 rounded-xl bg-[#31C678] text-white text-[16px] font-medium disabled:bg-gray-200 disabled:text-gray-400 transition-colors font-noto"
          >
            {submitting ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
