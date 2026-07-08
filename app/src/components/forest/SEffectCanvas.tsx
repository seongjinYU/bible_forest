"use client";

// S등급 획득 이펙트 — docs/earned-item-effects.md 스펙 구현.
// 줌인(~1.5s, 테마별 낙하/유입 파티클) → 폭발(방사형 버스트) → 줌아웃(~0.3s)
// cvB(다이얼로그 뒤) / cvF(다이얼로그 앞) 두 캔버스를 rAF 루프 하나로 같이 그린다.

import { useEffect, useRef } from "react";
import type { ThemeKey } from "@/constants/themes";
import { drawLeaf, drawStar, drawDrop } from "./effectShapes";

type Phase = "zoomIn" | "explode" | "zoomOut" | "done";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 0~1, 1이면 소멸
  trail: { x: number; y: number }[];
  layer: "back" | "front";
  rotation: number;
  spin: number; // rotation 증가량/frame
}

const PALETTE: Record<ThemeKey, string[]> = {
  forest: ["#97C459", "#639922", "#a8d55a", "#C0DD97", "#d4f0a0"],
  night: ["#AFA9EC", "#B5D4F4", "#ffd700", "#fff"],
  ocean: ["#378ADD", "#5DCAA5", "#85B7EB", "#9FE1CB", "#1D9E75"],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface SEffectCanvasProps {
  theme: ThemeKey;
  /** 폭발 시점(줌인 완료)에 아이콘을 감싼 wrapper에 회전을 걸기 위한 ref */
  iconWrapRef: React.RefObject<HTMLDivElement | null>;
  onDone: () => void;
}

export default function SEffectCanvas({ theme, iconWrapRef, onDone }: SEffectCanvasProps) {
  const cvBRef = useRef<HTMLCanvasElement>(null);
  const cvFRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      onDone();
      return;
    }

    const cvBEl = cvBRef.current;
    const cvFEl = cvFRef.current;
    if (!cvBEl || !cvFEl) return;
    const cvB: HTMLCanvasElement = cvBEl;
    const cvF: HTMLCanvasElement = cvFEl;
    const ctx2dB = cvB.getContext("2d");
    const ctx2dF = cvF.getContext("2d");
    if (!ctx2dB || !ctx2dF) return;
    const ctxB: CanvasRenderingContext2D = ctx2dB;
    const ctxF: CanvasRenderingContext2D = ctx2dF;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      for (const cv of [cvB, cvF]) {
        cv.width = window.innerWidth * dpr;
        cv.height = window.innerHeight * dpr;
        cv.style.width = "100vw";
        cv.style.height = "100vh";
      }
      ctxB.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxF.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    let particles: Particle[] = [];
    let spawnTimer: ReturnType<typeof setInterval> | null = null;
    let rafId: number | null = null;
    let phase: Phase = "zoomIn";
    let t = 0; // 0~1 진행도(구간별로 리셋)
    let iconRotY = 0;
    let iconSpin = 0; // deg/frame, 감속하며 0에 수렴
    let cancelled = false;

    function spawnForestFall() {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 5 + Math.random() * 5,
        size: 4 + Math.random() * 5,
        color: pick(PALETTE.forest),
        life: 0,
        trail: [],
        layer: "front",
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2,
      });
    }

    function spawnNightMeteor() {
      const edge = Math.floor(Math.random() * 3); // 0 top, 1 left, 2 right
      let x: number, y: number, vx: number, vy: number;
      if (edge === 0) {
        x = Math.random() * window.innerWidth;
        y = -20;
        vx = (cx - x) / 60 + (Math.random() - 0.5) * 2;
        vy = 6 + Math.random() * 3;
      } else if (edge === 1) {
        x = -20;
        y = Math.random() * window.innerHeight * 0.6;
        vx = 6 + Math.random() * 3;
        vy = (cy - y) / 60 + (Math.random() - 0.5) * 2;
      } else {
        x = window.innerWidth + 20;
        y = Math.random() * window.innerHeight * 0.6;
        vx = -(6 + Math.random() * 3);
        vy = (cy - y) / 60 + (Math.random() - 0.5) * 2;
      }
      particles.push({
        x, y, vx, vy,
        size: 2 + Math.random() * 1.5,
        color: pick(PALETTE.night),
        life: 0,
        trail: [],
        layer: "front",
        rotation: Math.atan2(vy, vx),
        spin: 0,
      });
    }

    function spawnOceanOrbit(ringIndex: number) {
      const radii = [60, 104, 148];
      const radius = radii[ringIndex];
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius * 0.5,
        vx: angle, // 궤도 파티클은 vx를 각도 저장용으로 재사용
        vy: radius, // vy는 반경 저장용으로 재사용
        size: 3 + Math.random() * 2,
        color: pick(PALETTE.ocean),
        life: 0,
        trail: [],
        layer: Math.sin(angle) > 0 ? "front" : "back",
        rotation: angle,
        spin: 0,
      });
    }

    function startSpawning() {
      if (theme === "forest") {
        spawnTimer = setInterval(() => { for (let i = 0; i < 5; i++) spawnForestFall(); }, 20);
      } else if (theme === "night") {
        spawnTimer = setInterval(spawnNightMeteor, 65);
      } else {
        let ring = 0;
        spawnTimer = setInterval(() => {
          spawnOceanOrbit(ring % 3);
          ring++;
        }, 40);
      }
    }
    startSpawning();

    function explode() {
      if (spawnTimer) clearInterval(spawnTimer);
      spawnTimer = null;

      // 낙하/유입 중이던 파티클을 방사형으로 튕겨나가게 전환
      for (const p of particles) {
        const angle = Math.atan2(p.y - cy, p.x - cx) || Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 4;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      }

      // 추가 방사형 버스트
      const burstCount = theme === "forest" ? 90 : theme === "night" ? 85 : 84;
      const palette = PALETTE[theme];
      for (let i = 0; i < burstCount; i++) {
        const angle = (Math.PI * 2 * i) / burstCount + Math.random() * 0.2;
        const speed = 3 + Math.random() * 6;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 3,
          color: pick(palette),
          life: 0,
          trail: [],
          layer: "front",
          rotation: angle,
          spin: theme === "forest" ? (Math.random() - 0.5) * 0.3 : 0,
        });
      }

      iconSpin = 15;
    }

    function step() {
      if (cancelled) return;
      ctxB.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctxF.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (phase === "zoomIn") {
        t += 0.011;
        if (t >= 1) { t = 1; phase = "explode"; explode(); }
      } else if (phase === "explode") {
        t = 1;
        phase = "zoomOut";
        t = 0;
      } else if (phase === "zoomOut") {
        t += 0.058;
        if (t >= 1) { t = 1; phase = "done"; }
      }

      const zoomT = phase === "zoomOut" ? 1 - t : t;
      const scale = 1 + zoomT * 0.24;
      const dim = Math.min(zoomT * 0.38, 0.38);

      for (const cv of [cvB, cvF]) {
        cv.style.transform = `scale(${scale})`;
      }

      if (iconWrapRef.current) {
        if (iconSpin > 0.05) {
          iconRotY += iconSpin;
          iconSpin *= 0.94;
        }
        iconWrapRef.current.style.transform = `rotateY(${iconRotY}deg)`;
      }

      const dimEl = document.getElementById("s-effect-dim");
      if (dimEl) dimEl.style.opacity = String(dim);

      particles = particles.filter((p) => {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 24) p.trail.shift();

        // 소용돌이(궤도) 파티클: 폭발 전까지는 각도로 회전
        if (theme === "ocean" && phase === "zoomIn") {
          p.x = cx + Math.cos(p.vx) * p.vy;
          p.y = cy + Math.sin(p.vx) * p.vy * 0.5;
          p.vx += 0.03; // 각속도 증가
          p.layer = Math.sin(p.vx) > 0 ? "front" : "back";
          p.rotation = p.vx;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += theme === "forest" && phase !== "zoomIn" ? 0.05 : 0;
          if (theme === "forest") p.rotation += p.spin;
        }

        if (phase === "zoomOut" || phase === "explode" || phase === "done") {
          p.life += phase === "done" ? 0.12 : 0.03;
        }

        const alpha = 1 - p.life;
        if (alpha <= 0) return false;
        const offscreen = p.x < -60 || p.x > window.innerWidth + 60 || p.y < -60 || p.y > window.innerHeight + 60;
        if (offscreen && phase !== "zoomIn") return false;

        const ctx = p.layer === "back" ? ctxB : ctxF;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        if (theme === "night" && p.trail.length > 1) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (const pt of p.trail) ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.fillStyle = "#fff";
        }

        if (theme === "forest") drawLeaf(ctx, p);
        else if (theme === "night") drawStar(ctx, p);
        else drawDrop(ctx, p);

        ctx.globalAlpha = 1;
        return true;
      });

      if (phase === "done" && particles.length === 0) {
        onDone();
        return;
      }
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);

    const iconWrapEl = iconWrapRef.current;
    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      if (spawnTimer) clearInterval(spawnTimer);
      if (rafId) cancelAnimationFrame(rafId);
      particles = [];
      ctxB.clearRect(0, 0, cvB.width, cvB.height);
      ctxF.clearRect(0, 0, cvF.width, cvF.height);
      if (iconWrapEl) iconWrapEl.style.transform = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <>
      <canvas ref={cvBRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }} />
      <div
        id="s-effect-dim"
        className="fixed inset-0 pointer-events-none bg-black"
        style={{ zIndex: 6, opacity: 0 }}
      />
      <canvas ref={cvFRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 20 }} />
    </>
  );
}
