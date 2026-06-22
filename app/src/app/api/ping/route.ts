// ┌─────────────────────────────────────────────────────────────────┐
// │  GET /api/ping                                                    │
// │  warmup/health 용 경량 엔드포인트. 외부 cron(cron-job.org 등)에서  │
// │  5~10분 주기로 호출해 Node 람다를 미리 깨워둔다.                    │
// │                                                                   │
// │  ⚠️ 한계: Vercel은 라우트별 람다가 분리되므로 이 핑 하나로는        │
// │     인증 데이터 라우트(users/me, bible/status 등)까지 warm되지     │
// │     않는다. 엔트리 콜드스타트 제거의 실질 효과는 Edge 전환이 담당.  │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from "next/server";

// 콜드스타트가 발생하는 Node 런타임을 일부러 사용(= warmup 대상).
export const runtime = "nodejs";
// 항상 동적 실행(정적 캐시되지 않도록).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, t: Date.now() });
}
