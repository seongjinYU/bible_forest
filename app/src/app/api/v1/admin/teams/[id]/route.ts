// ┌─────────────────────────────────────────────────────────────────┐
// │  /api/v1/admin/teams/[id]   (어드민 전용)                          │
// │  PATCH  : 팀 테마 변경                                             │
// │  DELETE : 팀 삭제. 단, 소속된 사용자/나무가 있으면 막는다(FK 보호). │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase'

const VALID_THEMES = ['forest', 'night', 'ocean']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: '어드민 권한이 필요합니다.' }, { status: 403 })
  }

  const { id } = await params
  let body: { theme?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (typeof body.theme !== 'string' || !VALID_THEMES.includes(body.theme)) {
    return NextResponse.json({ message: '올바르지 않은 테마입니다.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('teams')
    .update({ theme: body.theme })
    .eq('id', id)
    .select('id, name, theme')
    .single()

  if (error || !data) {
    return NextResponse.json({ message: '팀을 찾을 수 없습니다.' }, { status: 404 })
  }
  return NextResponse.json({ team: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: '어드민 권한이 필요합니다.' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createSupabaseServerClient()

  // 소속 사용자/나무가 있으면 삭제 차단 (FK 위반 방지 + 데이터 보호)
  const [{ count: userCount }, { count: treeCount }] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('team_id', id),
    supabase.from('trees').select('*', { count: 'exact', head: true }).eq('team_id', id),
  ])

  if ((userCount ?? 0) > 0 || (treeCount ?? 0) > 0) {
    return NextResponse.json(
      { message: '소속된 사용자나 나무가 있어 삭제할 수 없습니다.' },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ message: '팀 삭제에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ message: '삭제되었습니다.' })
}
