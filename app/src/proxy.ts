import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ┌─────────────────────────────────────────────────────────────────┐
// │  서비스 종료 스위치. 환경변수와 무관하게 이 상수 하나로 제어한다.    │
// │  true인 동안 admin/API/정적 자산을 제외한 모든 페이지가             │
// │  /closed(종료 안내)로 리라이트된다. 다시 열려면 false로 바꾸고      │
// │  재배포하면 된다.                                                  │
// └─────────────────────────────────────────────────────────────────┘
const SERVICE_CLOSED = true;

export function proxy(request: NextRequest) {
  if (!SERVICE_CLOSED) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/closed") return NextResponse.next();

  return NextResponse.rewrite(new URL("/closed", request.url));
}

export const config = {
  matcher: [
    "/((?!admin|api|closed|_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
