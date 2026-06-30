"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ThemeKey } from "@/constants/themes";

export const BGM_SRC: Partial<Record<ThemeKey, string>> = {
  forest: "/assets/forest/bgm.mp3",
  night: "/assets/night/bgm.mp3",
  ocean: "/assets/ocean/bgm.mp3",
};
export const BGM_TITLE: Partial<Record<ThemeKey, string>> = {
  forest: "Forest Sprout Parade",
  night: "Starry Bloom",
  ocean: "Coral Garden",
};
const BGM_PREF_KEY = "bgm_on";

interface BgmContextValue {
  playing: boolean;
  toggle: () => void;
}

const BgmContext = createContext<BgmContextValue>({ playing: false, toggle: () => {} });

export function BgmProvider({ theme, children }: { theme: ThemeKey; children: React.ReactNode }) {
  const bgmSrc = BGM_SRC[theme];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // 페이지 전환 간에도 동일 <audio> 엘리먼트가 유지되도록 루트(레이아웃)에서 한 번만 마운트.
  useEffect(() => {
    if (typeof window === "undefined") return;
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;
    audioRef.current.preload = "none";
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // 테마가 바뀌면 곡을 교체. 재생 중이었다면 끊김 없이 새 곡으로 이어 재생.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !bgmSrc) return;
    const wasPlaying = !el.paused;
    el.src = bgmSrc;
    if (wasPlaying || localStorage.getItem(BGM_PREF_KEY) === "1") {
      el.play().then(() => setPlaying(true)).catch(() => { /* 자동재생 차단 시 무시 */ });
    }
  }, [bgmSrc]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      localStorage.setItem(BGM_PREF_KEY, "0");
    } else {
      el.play().then(() => {
        setPlaying(true);
        localStorage.setItem(BGM_PREF_KEY, "1");
      }).catch(() => { /* 재생 실패 무시 */ });
    }
  }

  return <BgmContext.Provider value={{ playing, toggle }}>{children}</BgmContext.Provider>;
}

export function useBgm(): BgmContextValue {
  return useContext(BgmContext);
}
