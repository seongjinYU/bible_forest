import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 콜드스타트 완화: 이 라우트는 DB(Supabase) 접근이 없어 Edge로 안전하게 전환 가능.
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ message: '비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_session', 'true', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return NextResponse.json({ message: '로그인 되었습니다.' })
}
