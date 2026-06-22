"use client";

import { useState, useEffect, useRef } from "react";

export type Activity = {
  book_name: string;
  chapter: number;
  nickname: string;
  team_name: string;
};

const CYCLE_MS = 7000;
const POLL_MS = 30_000;

export default function ActivityTicker({ initial }: { initial: Activity[] }) {
  const [activities, setActivities] = useState<Activity[]>(initial);
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  // keep latest activities in ref so poll callback doesn't go stale
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;

  // 자동 사이클
  useEffect(() => {
    if (activities.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % activities.length);
      setAnimKey((k) => k + 1);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [activities.length]);

  // 신규 활동 폴링
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
          setActivities(data);
          setIndex(0);
          setAnimKey((k) => k + 1);
        }
      } catch {
        // 네트워크 오류 무시
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const activity = activities[index];
  if (!activity) return null;

  return (
    <div className="mb-4">
      <div className="rounded-[14px] bg-[#111111] px-4 py-3.5 flex items-center gap-2.5 overflow-hidden">
        <span className="text-[18px] shrink-0">🍀</span>
        <p key={animKey} className="text-[13px] font-pretendard leading-snug animate-ticker-in">
          <span className="text-white/70">
            {activity.team_name} {activity.nickname}님{" "}
          </span>
          <span className="text-white font-bold">
            {activity.book_name} {activity.chapter}장
          </span>
          <span className="text-white/70"> 인증 완료!</span>
        </p>
      </div>
    </div>
  );
}
