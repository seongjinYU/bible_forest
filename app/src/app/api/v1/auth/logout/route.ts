import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// 콜드스타트 완화: 이 라우트는 DB(Supabase) 접근이 없어 Edge로 안전하게 전환 가능.
export const runtime = 'edge'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('user_id')
  return NextResponse.json({ message: '로그아웃 되었습니다.' })
}
