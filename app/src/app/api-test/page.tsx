"use client";

// ┌─────────────────────────────────────────────────────────────┐
// │  /api-test  — 새로 만든 API들을 브라우저에서 직접 눌러보는 페이지 │
// │  (개발/테스트 전용. 실제 서비스 화면 아님.)                      │
// └─────────────────────────────────────────────────────────────┘

import { useEffect, useState } from "react";
import { NT_BOOKS } from "@/constants/bible";

type ApiResult = { method: string; path: string; status: number; body: unknown };
type Team = { id: string; name: string };

export default function ApiTestPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  // 로그인(회원가입) 입력
  const [nickname, setNickname] = useState("테스터");
  const [teamId, setTeamId] = useState("");

  // bible 권 단위 replace 입력
  const [book, setBook] = useState<string>(NT_BOOKS[0].name);
  const [chapter, setChapter] = useState(1);
  const [rangeTo, setRangeTo] = useState(10);
  const [chaptersList, setChaptersList] = useState<number[]>([]); // 그 권의 체크된 장 목록

  // trees/place 입력
  const [treeId, setTreeId] = useState("");
  const [x, setX] = useState(45.5);
  const [y, setY] = useState(80.2);

  // forests 입력
  const [forestTeamId, setForestTeamId] = useState("");

  async function call(method: string, path: string, body?: unknown) {
    setLoading(true);
    try {
      const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch { /* 텍스트 그대로 */ }
      setResult({ method, path, status: res.status, body: data });
      return data;
    } catch (e) {
      setResult({ method, path, status: 0, body: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams() {
    const data = await call("GET", "/api/v1/teams");
    const list = (data as { teams?: Team[] })?.teams ?? [];
    setTeams(list);
    if (list[0]) { setTeamId((t) => t || list[0].id); setForestTeamId((t) => t || list[0].id); }
  }
  useEffect(() => { loadTeams(); }, []);

  async function loadInventory() {
    const data = await call("GET", "/api/v1/trees/inventory");
    const first = (data as { trees?: { tree_id: string }[] })?.trees?.[0];
    if (first) setTreeId(first.tree_id);
  }

  // ── 권의 장 목록 관리 (number[]) ──
  function addOne() {
    setChaptersList((p) => (p.includes(chapter) ? p : [...p, chapter].sort((a, b) => a - b)));
  }
  function addRange() {
    const lo = Math.min(chapter, rangeTo), hi = Math.max(chapter, rangeTo);
    const set = new Set(chaptersList);
    for (let c = lo; c <= hi; c++) set.add(c);
    setChaptersList([...set].sort((a, b) => a - b));
  }
  function removeChapter(c: number) { setChaptersList((p) => p.filter((x) => x !== c)); }

  const box = "border border-gray-200 rounded-lg p-4 flex flex-col gap-3";
  const btn = "px-3 py-2 rounded-md bg-[#31C678] text-white text-sm font-medium disabled:opacity-50";
  const btn2 = "px-3 py-2 rounded-md bg-gray-700 text-white text-sm font-medium disabled:opacity-50";
  const btn3 = "px-2.5 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm disabled:opacity-50";
  const inp = "border border-gray-300 rounded-md px-2 py-1.5 text-sm";

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">🧪 API 테스트 페이지</h1>
        <p className="text-sm text-gray-500 mt-1">
          버튼을 누르면 실제 API가 호출됩니다. <b>먼저 1번에서 회원가입(로그인)</b> 하세요.
        </p>
      </div>

      {/* 1. 로그인 */}
      <div className={box}>
        <h2 className="font-bold">1. 회원가입 / 로그인 <span className="text-xs text-gray-400">POST /auth/register · GET /users/me</span></h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input className={inp} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" />
          <select className={inp} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className={btn} disabled={loading} onClick={() => call("POST", "/api/v1/auth/register", { nickname, team_id: teamId })}>회원가입 + 로그인</button>
          <button className={btn2} disabled={loading} onClick={() => call("GET", "/api/v1/users/me")}>내 정보 확인</button>
        </div>
      </div>

      {/* 2. Bible (권 단위 replace) */}
      <div className={box}>
        <h2 className="font-bold">2. 성경 읽기 (권 단위 replace) <span className="text-xs text-gray-400">GET/PATCH /bible/progress · GET /bible/status</span></h2>
        <div className="flex flex-wrap gap-2">
          <button className={btn2} disabled={loading} onClick={() => call("GET", "/api/v1/bible/status")}>요약 조회 (status)</button>
          <button className={btn2} disabled={loading} onClick={() => call("GET", "/api/v1/bible/progress")}>전체 현황 (progress)</button>
        </div>

        {/* 권 선택 + 장 목록 만들기 */}
        <div className="flex flex-wrap gap-2 items-center border-t pt-3">
          <select className={inp} value={book} onChange={(e) => setBook(e.target.value)}>
            {NT_BOOKS.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
          <input className={`${inp} w-16`} type="number" min={1} value={chapter} onChange={(e) => setChapter(Number(e.target.value))} title="시작 장" />
          <button className={btn3} disabled={loading} onClick={addOne}>+ 이 장</button>
          <span className="text-gray-400 text-sm">~</span>
          <input className={`${inp} w-16`} type="number" min={1} value={rangeTo} onChange={(e) => setRangeTo(Number(e.target.value))} title="끝 장" />
          <button className={btn3} disabled={loading} onClick={addRange}>+ 범위</button>
        </div>

        {/* 선택된 장 칩 (해당 권) */}
        <div className="flex flex-wrap gap-1.5 bg-gray-50 rounded-md p-2 min-h-[36px] items-center">
          <span className="text-xs text-gray-500 mr-1">{book} 체크할 장:</span>
          {chaptersList.length === 0 && <span className="text-xs text-gray-400">없음 (빈 목록 = 그 권 전체 해제)</span>}
          {chaptersList.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 bg-white border border-gray-300 rounded-full px-2 py-0.5 text-xs">
              {c}장
              <button className="text-gray-400 hover:text-red-500" onClick={() => removeChapter(c)}>✕</button>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            className={btn}
            disabled={loading}
            onClick={() => call("PATCH", "/api/v1/bible/progress", { book_name: book, chapters: chaptersList })}
          >
            {book} = 이 목록으로 교체 (PATCH)
          </button>
          <button className={btn3} disabled={loading} onClick={() => setChaptersList([])}>목록 비우기</button>
        </div>
        <p className="text-xs text-gray-400">
          권 단위 replace: 이 목록이 곧 {book}의 “체크된 장 전체”가 됩니다. 10장 채우면 나무 1그루,
          줄이면 응답의 <b>reclaimed_count</b>로 회수 확인. 빈 목록으로 보내면 그 권 전체 해제.
        </p>
      </div>

      {/* 3. Trees */}
      <div className={box}>
        <h2 className="font-bold">3. 나무 / 배치 <span className="text-xs text-gray-400">GET /trees/inventory · POST /trees/place</span></h2>
        <button className={btn2} disabled={loading} onClick={loadInventory}>미배치 나무 목록 (inventory)</button>
        <div className="flex flex-wrap gap-2 items-center border-t pt-3">
          <input className={`${inp} flex-1 min-w-[260px]`} value={treeId} onChange={(e) => setTreeId(e.target.value)} placeholder="tree_id (인벤토리 조회 시 자동 입력)" />
          <input className={`${inp} w-20`} type="number" value={x} onChange={(e) => setX(Number(e.target.value))} placeholder="x" />
          <input className={`${inp} w-20`} type="number" value={y} onChange={(e) => setY(Number(e.target.value))} placeholder="y" />
          <button className={btn} disabled={loading || !treeId} onClick={() => call("POST", "/api/v1/trees/place", { tree_id: treeId, x, y })}>배치 (place)</button>
        </div>
      </div>

      {/* 4. Forests */}
      <div className={box}>
        <h2 className="font-bold">4. 팀 숲 <span className="text-xs text-gray-400">GET /forests/:team_id</span></h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={inp} value={forestTeamId} onChange={(e) => setForestTeamId(e.target.value)}>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className={btn} disabled={loading || !forestTeamId} onClick={() => call("GET", `/api/v1/forests/${forestTeamId}`)}>팀 숲 조회</button>
        </div>
      </div>

      {/* 응답 표시 */}
      <div className="border-2 border-gray-800 rounded-lg overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>응답 (Response)</span>
          {result && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${result.status >= 200 && result.status < 300 ? "bg-green-500" : "bg-red-500"}`}>
              {result.method} {result.path} → {result.status || "ERR"}
            </span>
          )}
        </div>
        <pre className="p-4 text-sm overflow-x-auto bg-gray-50 min-h-[100px] whitespace-pre-wrap">
          {result ? JSON.stringify(result.body, null, 2) : "버튼을 눌러보세요…"}
        </pre>
      </div>
    </div>
  );
}
