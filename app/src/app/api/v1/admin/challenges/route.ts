// ┌─────────────────────────────────────────────────────────────────┐
// │  /api/v1/admin/challenges   (어드민 전용)                          │
// │  GET  : 챌린지 목록                                                │
// │  POST : 챌린지 생성 (기본 비활성)                                  │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: '어드민 권한이 필요합니다.' }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('challenges')
    .select('id, name, start_date, end_date, is_active')
    .order('start_date', { ascending: false })

  if (error) {
    return NextResponse.json({ message: '챌린지를 불러오지 못했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ challenges: data ?? [] })
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: '어드민 권한이 필요합니다.' }, { status: 403 })
  }

  let body: { name?: unknown; start_date?: unknown; end_date?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { name, start_date, end_date } = body
  if (typeof name !== 'string' || !name.trim() || typeof start_date !== 'string' || typeof end_date !== 'string') {
    return NextResponse.json({ message: '이름과 기간을 입력해주세요.' }, { status: 400 })
  }
  if (start_date > end_date) {
    return NextResponse.json({ message: '종료일은 시작일 이후여야 합니다.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('challenges')
    .insert({ name: name.trim(), start_date, end_date, is_active: false })
    .select('id, name, start_date, end_date, is_active')
    .single()

  if (error || !data) {
    return NextResponse.json({ message: '챌린지 생성에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ challenge: data }, { status: 201 })
}
