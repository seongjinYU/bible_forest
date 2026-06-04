import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { nickname, team_id } = body

  if (!nickname || !team_id) {
    return NextResponse.json({ message: '닉네임과 팀을 선택해주세요.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', team_id)
    .single()

  if (!team) {
    return NextResponse.json({ message: '유효하지 않은 팀입니다.' }, { status: 400 })
  }

  const { data: user, error } = await supabase
    .from('users')
    .insert({ nickname, team_id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ message: '회원가입에 실패했습니다.' }, { status: 500 })
  }

  const cookieStore = await cookies()
  cookieStore.set('user_id', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 60,
    path: '/',
  })

  return NextResponse.json({ user }, { status: 201 })
}
