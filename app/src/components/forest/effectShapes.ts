// S/A등급 획득 이펙트 공용 도형 그리기 — 나뭇잎/별/물방울.
// 각 draw 함수는 캔버스 좌표계에 이미 x/y/rotation이 반영된 파티클을 그대로 받는다.

interface ShapeParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
}

export function drawLeaf(ctx: CanvasRenderingContext2D, p: ShapeParticle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = Math.max(0.5, p.size * 0.08);
  ctx.beginPath();
  ctx.moveTo(-p.size, 0);
  ctx.lineTo(p.size, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawStar(ctx: CanvasRenderingContext2D, p: ShapeParticle, rayLen?: number) {
  const r = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.beginPath();
  ctx.moveTo(0, -r * 2.2);
  ctx.quadraticCurveTo(r * 0.28, -r * 0.28, r * 2.2, 0);
  ctx.quadraticCurveTo(r * 0.28, r * 0.28, 0, r * 2.2);
  ctx.quadraticCurveTo(-r * 0.28, r * 0.28, -r * 2.2, 0);
  ctx.quadraticCurveTo(-r * 0.28, -r * 0.28, 0, -r * 2.2);
  ctx.closePath();
  ctx.fill();
  if (rayLen) {
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-rayLen, 0);
    ctx.lineTo(rayLen, 0);
    ctx.moveTo(0, -rayLen);
    ctx.lineTo(0, rayLen);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDrop(ctx: CanvasRenderingContext2D, p: ShapeParticle) {
  const r = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.6);
  ctx.quadraticCurveTo(r * 1.1, r * 0.3, 0, r * 1.1);
  ctx.quadraticCurveTo(-r * 1.1, r * 0.3, 0, -r * 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, r * 0.15, r * 0.28, r * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
