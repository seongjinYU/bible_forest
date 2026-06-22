// ┌─────────────────────────────────────────────────────────────────┐
// │  /api/v1/admin/teams   (어드민 전용)                               │
// │  GET  : 팀 목록 (테마 포함)                                        │
// │  POST : 팀 생성 (기본 테마 forest)                                 │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase'

const VALID_THEMES = ['forest', 'night', 'ocean']

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: '어드민 권한이 필요합니다.' }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, theme')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ message: '팀을 불러오지 못했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ teams: data ?? [] })
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: '어드민 권한이 필요합니다.' }, { status: 403 })
  }

  let body: { name?: unknown; theme?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { name } = body
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ message: '팀 이름을 입력해주세요.' }, { status: 400 })
  }
  const theme = typeof body.theme === 'string' && VALID_THEMES.includes(body.theme) ? body.theme : 'forest'

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('teams')
    .insert({ name: name.trim(), theme })
    .select('id, name, theme')
    .single()

  if (error || !data) {
    return NextResponse.json({ message: '팀 생성에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ team: data }, { status: 201 })
}
