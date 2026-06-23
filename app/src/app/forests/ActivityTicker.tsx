"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type Activity = {
  book_name: string;
  chapter: number;
  nickname: string;
  team_name: string;
};

const CYCLE_MS = 7000;
const POLL_MS = 30_000;
const ANIM_MS = 450;
const LINE_H = 18; // px — text-[13px] × leading-snug(1.375) ≈ 18px

function Line({ activity }: { activity: Activity }) {
  return (
    <>
      <span className="text-white/70">
        {activity.team_name} {activity.nickname}님{" "}
      </span>
      <span className="text-white font-bold">
        {activity.book_name} {activity.chapter}장
      </span>
      <span className="text-white/70"> 인증 완료!</span>
    </>
  );
}

export default function ActivityTicker({ initial }: { initial: Activity[] }) {
  const [activities, setActivities] = useState<Activity[]>(initial);
  const [current, setCurrent] = useState<Activity | null>(initial[0] ?? null);
  const [next, setNext] = useState<Activity | null>(null);
  const [sliding, setSliding] = useState(false);
  // key가 바뀔 때마다 inner div를 리마운트 → 애니메이션 확실히 재트리거
  const [animKey, setAnimKey] = useState(0);

  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;
  const indexRef = useRef(0);
  const slidingRef = useRef(false);

  const startTransition = useCallback((nextAct: Activity) => {
    setNext(nextAct);
    setSliding(true);
    setAnimKey((k) => k + 1);
    slidingRef.current = true;

    setTimeout(() => {
      setCurrent(nextAct);
      setNext(null);
      setSliding(false);
      slidingRef.current = false;
    }, ANIM_MS);
  }, []);

  const advance = useCallback(() => {
    if (slidingRef.current) return;
    const acts = activitiesRef.current;
    if (acts.length <= 1) return;
    const nextIdx = (indexRef.current + 1) % acts.length;
    indexRef.current = nextIdx;
    startTransition(acts[nextIdx]);
  }, [startTransition]);

  useEffect(() => {
    if (activities.length <= 1) return;
    const id = setInterval(advance, CYCLE_MS);
    return () => clearInterval(id);
  }, [activities.length, advance]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/v1/activities/recent");
        if (!res.ok) return;
        const data: Activity[] = await res.json();
        if (!data.length) return;
        const top = activitiesRef.current[0];
        const incoming = data[0];
        const isNew =
          !top ||
          top.nickname !== incoming.nickname ||
          top.book_name !== incoming.book_name ||
          top.chapter !== incoming.chapter;
        if (isNew) {
          activitiesRef.current = data;
          setActivities(data);
          indexRef.current = 0;
          if (!slidingRef.current) {
            startTransition(data[0]);
          } else {
            setCurrent(data[0]);
          }
        }
      } catch {}
    }, POLL_MS);
    return () => clearInterval(id);
  }, [startTransition]);

  if (!current) return null;

  return (
    <div className="mb-4">
      <div className="rounded-[14px] bg-[#111111] px-4 py-3.5 flex items-center gap-2.5">
        <span className="text-[18px] shrink-0">🍀</span>
        {/*
          슬롯머신 구조:
          - 바깥 div: height=LINE_H + overflow-hidden → 1줄만 노출
          - 안쪽 div: [현재/다음] 세로 스택, key가 바뀌면 리마운트
          - 애니메이션: 스택 전체를 -18px 올림 → 다음 텍스트가 아래서 밀고 올라옴
        */}
        <div className="flex-1 overflow-hidden" style={{ height: LINE_H }}>
          <div
            key={animKey}
            className={sliding && next ? "animate-ticker-push" : undefined}
            style={{ height: sliding && next ? LINE_H * 2 : LINE_H }}
          >
            <p
              className="text-[13px] font-pretendard leading-snug truncate"
              style={{ height: LINE_H }}
            >
              <Line activity={current} />
            </p>
            {sliding && next && (
              <p
                className="text-[13px] font-pretendard leading-snug truncate"
                style={{ height: LINE_H }}
              >
                <Line activity={next} />
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
