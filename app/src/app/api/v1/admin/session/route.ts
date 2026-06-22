// ┌─────────────────────────────────────────────────────────────────┐
// │  GET /api/v1/admin/session                                        │
// │  어드민 세션(admin_session 쿠키) 유효 여부만 확인하는 경량 엔드포인트.│
// │  admin_session 쿠키는 httpOnly라 클라이언트 JS가 직접 못 읽으므로   │
// │  레이아웃 게이트가 이 엔드포인트로 인증 상태를 확인한다.             │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_session')?.value !== 'true') {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}
