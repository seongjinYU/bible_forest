"use client";

// A등급 획득 이펙트 — docs/earned-item-effects.md 스펙 구현.
// S등급과 달리 줌/폭발 없이, 아이템 썸네일 주변에서 짧게 한 번 터지고
// 빠르게 페이드아웃되는 원샷 파티클. 다이얼로그 카드는 계속 보인 채로 재생된다.

import { useEffect, useRef } from "react";
import type { ThemeKey } from "@/constants/themes";
import { drawLeaf, drawStar, drawDrop } from "./effectShapes";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 0~1, 1이면 소멸
  phase: number; // 사인파 위상(우주/바다 진동용)
  isBig?: boolean;
  rotation: number;
}

const PALETTE = {
  forest: ["#7BBF48", "#5A9E20", "#A8D55A", "#C0DD97"],
  night: ["#AFA9EC", "#EEEDFE", "#B5D4F4", "#fff", "#ffd700"],
  ocean: ["#378ADD", "#85B7EB", "#5DCAA5", "#9FE1CB"],
} satisfies Record<ThemeKey, string[]>;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface AEffectCanvasProps {
  theme: ThemeKey;
  /** 파티클이 감싸는 대상(원형 썸네일)의 중심 좌표를 얻기 위한 ref */
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onDone: () => void;
}

export default function AEffectCanvas({ theme, anchorRef, onDone }: AEffectCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      onDone();
      return;
    }

    const canvasEl = canvasRef.current;
    const anchorEl = anchorRef.current;
    if (!canvasEl || !anchorEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = anchorEl.getBoundingClientRect();
    // 캔버스는 앵커 기준 사방으로 넉넉히(바다는 좌우에서 유입되므로 폭을 더 크게) 확장
    const pad = theme === "ocean" ? 160 : 80;
    const width = rect.width + pad * 2;
    const height = rect.height + pad * 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.left = `${rect.left - pad}px`;
    canvas.style.top = `${rect.top - pad}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = width / 2;
    const cy = height / 2;

    let particles: Particle[] = [];
    let rafId: number | null = null;
    let cancelled = false;
    let elapsedFrames = 0;

    if (theme === "forest") {
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3.5 + Math.random() * 3.5;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 3,
          color: pick(PALETTE.forest),
          life: 0,
          phase: 0,
          rotation: Math.random() * Math.PI * 2,
        });
      }
    } else if (theme === "night") {
      for (let i = 0; i < 38; i++) {
        const isBig = Math.random() < 0.25;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          size: isBig ? 1.6 + Math.random() * 0.8 : 0.8 + Math.random() * 0.8,
          color: pick(PALETTE.night),
          life: 0,
          phase: Math.random() * Math.PI * 2,
          isBig,
          rotation: Math.random() * Math.PI * 2,
        });
      }
    } else {
      // ocean: 좌우 양쪽에서 중앙을 향해 흘러오는 물방울
      for (let i = 0; i < 30; i++) {
        const fromLeft = i % 2 === 0;
        particles.push({
          x: fromLeft ? -10 : width + 10,
          y: cy + (Math.random() - 0.5) * height * 0.6,
          vx: (fromLeft ? 1 : -1) * (1.5 + Math.random() * 1.5),
          vy: 0,
          size: 2.5 + Math.random() * 2.5,
          color: pick(PALETTE.ocean),
          life: 0,
          phase: Math.random() * Math.PI * 2,
          rotation: 0,
        });
      }
    }

    function step() {
      if (cancelled) return;
      ctx.clearRect(0, 0, width, height);
      elapsedFrames++;

      const forestDuration = 34; // 짧게 터졌다 빠르게 사라짐
      const nightDuration = 70; // 반짝이다 사라짐
      const oceanDuration = 60; // 파도가 중앙을 스쳐 지나감

      particles = particles.filter((p) => {
        p.phase += 0.15;

        if (theme === "forest") {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.life = elapsedFrames / forestDuration;
          p.rotation += 0.06;
        } else if (theme === "night") {
          // 제자리에서 사인파로 반짝임
          p.life = elapsedFrames / nightDuration;
        } else {
          p.x += p.vx;
          p.y = p.y + Math.sin(p.phase) * 0.6;
          p.life = elapsedFrames / oceanDuration;
        }

        if (p.life >= 1) return false;

        const flicker = theme === "night" ? (Math.sin(p.phase) + 1) / 2 : 1;
        const fadeOut = theme === "forest" ? Math.max(0, 1 - p.life) : 1 - p.life * 0.4;
        const alpha = Math.min(1, flicker * fadeOut + (theme === "night" ? 0.15 : 0));

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = p.color;

        if (theme === "forest") drawLeaf(ctx, p);
        else if (theme === "night") drawStar(ctx, p, p.isBig ? p.size * 4 : undefined);
        else drawDrop(ctx, p);

        ctx.globalAlpha = 1;
        return true;
      });

      const maxDuration = theme === "forest" ? forestDuration : theme === "night" ? nightDuration : oceanDuration;
      if (particles.length === 0 || elapsedFrames > maxDuration + 10) {
        onDone();
        return;
      }
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      particles = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return <canvas ref={canvasRef} className="fixed pointer-events-none" style={{ zIndex: 60 }} />;
}
