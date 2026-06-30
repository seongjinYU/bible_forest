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

  // 같은 팀에 같은 닉네임이 이미 있으면 그 계정으로 자동 로그인한다.
  // (닉네임 유니크 제약이 없어 과거 동명이인 정책으로 중복 생성됐을 수 있으므로
  //  가장 먼저 만들어진 계정을 사용)
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('team_id', team_id)
    .eq('nickname', nickname)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let user = existing
  let isNew = false

  if (!user) {
    const { data: created, error } = await supabase
      .from('users')
      .insert({ nickname, team_id })
      .select()
      .single()

    if (error) {
      // unique violation (23505): 동시 요청으로 직전에 다른 insert가 끼어든 경우
      // → 방금 생성된 계정을 재조회해서 로그인 처리
      if (error.code === '23505') {
        const { data: race } = await supabase
          .from('users')
          .select('*')
          .eq('team_id', team_id)
          .eq('nickname', nickname)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (race) {
          user = race
        } else {
          return NextResponse.json({ message: '회원가입에 실패했습니다.' }, { status: 500 })
        }
      } else {
        return NextResponse.json({ message: '회원가입에 실패했습니다.' }, { status: 500 })
      }
    } else if (!created) {
      return NextResponse.json({ message: '회원가입에 실패했습니다.' }, { status: 500 })
    } else {
      user = created
      isNew = true
    }
  }

  const cookieStore = await cookies()
  cookieStore.set('user_id', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 60,
    path: '/',
  })

  // 신규 가입은 201, 기존 계정 자동 로그인은 200. is_new로 프론트가 분기한다.
  return NextResponse.json({ user, is_new: isNew }, { status: isNew ? 201 : 200 })
}
