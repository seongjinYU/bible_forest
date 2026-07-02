"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ThemeKey } from "@/constants/themes";

const BGM_MUTED_PATHS = ["/register"];

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
  const pathname = usePathname();
  const muted = BGM_MUTED_PATHS.includes(pathname);
  const resumeAfterMuteRef = useRef(false);

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
    if (muted) return;
    if (wasPlaying || localStorage.getItem(BGM_PREF_KEY) === "1") {
      el.play().then(() => setPlaying(true)).catch(() => { /* 자동재생 차단 시 무시 */ });
    }
  }, [bgmSrc, muted]);

  // 특정 페이지(예: 회원가입)에서는 브금을 잠시 끈다. 재생 중이었다면
  // 벗어날 때 다시 이어 재생하고, 꺼져 있었다면 그대로 둔다.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (muted) {
      if (!el.paused) {
        resumeAfterMuteRef.current = true;
        el.pause();
        setPlaying(false);
      }
    } else if (resumeAfterMuteRef.current) {
      resumeAfterMuteRef.current = false;
      el.play().then(() => setPlaying(true)).catch(() => { /* 자동재생 차단 시 무시 */ });
    }
  }, [muted]);

  function toggle() {
    const el = audioRef.current;
    if (!el || muted) return;
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
