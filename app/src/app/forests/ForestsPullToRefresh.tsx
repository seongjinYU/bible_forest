"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 64;

export default function ForestsPullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // 탭/앱 복귀 시 자동 갱신
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  function onTouchStart(e: React.TouchEvent) {
    if ((scrollRef.current?.scrollTop ?? 1) > 0) return;
    startYRef.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if ((scrollRef.current?.scrollTop ?? 1) > 0) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) setPull(Math.min(delta * 0.55, THRESHOLD + 20));
  }

  async function onTouchEnd() {
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      router.refresh();
      await new Promise<void>((r) => setTimeout(r, 800));
      setRefreshing(false);
    }
    setPull(0);
  }

  const progress = Math.min(pull / THRESHOLD, 1);
  const indicatorH = pull > 6 ? pull * 0.55 : 0;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 pb-20"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        overscrollBehaviorY: "none",
      } as React.CSSProperties}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh 인디케이터 */}
      <div
        className="flex items-center justify-center transition-[height] duration-200"
        style={{ height: indicatorH }}
      >
        {pull > 6 && (
          refreshing ? (
            <div className="w-5 h-5 rounded-full border-2 border-[#31C678] border-t-transparent animate-spin" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              style={{
                color: "#31C678",
                opacity: progress,
                transform: `rotate(${progress * 300}deg)`,
                transition: "opacity 0.1s",
              }}
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                d="M12 4 A8 8 0 1 1 4.93 19.07"
              />
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="9,4 12,1 15,4"
              />
            </svg>
          )
        )}
      </div>

      {children}
    </div>
  );
}
