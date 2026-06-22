// ┌─────────────────────────────────────────────────────────────────┐
// │  POST /api/v1/admin/logout                                        │
// │  admin_session 쿠키를 삭제해 어드민 세션을 종료한다.               │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  return NextResponse.json({ message: '로그아웃 되었습니다.' })
}
