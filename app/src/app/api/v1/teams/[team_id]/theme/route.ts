import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { team_id } = await params
  const { theme } = await request.json()

  if (!theme) {
    return NextResponse.json({ message: '테마를 선택해주세요.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  // theme이 null인 팀만 업데이트 허용 — 동시 요청으로 다른 팀원이 먼저 설정했으면 0 row 반환
  const { data: updated, error } = await supabase
    .from('teams')
    .update({ theme })
    .eq('id', team_id)
    .is('theme', null)
    .select('id')

  if (error) {
    return NextResponse.json({ message: '테마 저장에 실패했습니다.' }, { status: 500 })
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ message: '이미 다른 팀원이 테마를 설정했습니다.' }, { status: 409 })
  }

  return NextResponse.json({ success: true })
}
