// ┌─────────────────────────────────────────────────────────────────┐
// │  /api/v1/admin/challenges/[id]   (어드민 전용)                     │
// │  PATCH  : 이름/기간/활성 수정. 활성화 시 다른 챌린지는 모두 비활성  │
// │           (읽기 체크가 "활성 1개"를 전제로 하므로)                  │
// │  DELETE : 챌린지 삭제                                              │
// └─────────────────────────────────────────────────────────────────┘

import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: '어드민 권한이 필요합니다.' }, { status: 403 })
  }

  const { id } = await params
  let body: { name?: unknown; start_date?: unknown; end_date?: unknown; is_active?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
  if (typeof body.start_date === 'string') patch.start_date = body.start_date
  if (typeof body.end_date === 'string') patch.end_date = body.end_date
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: '변경할 내용이 없습니다.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  // 활성화 요청이면 단일 활성 보장: 자기 자신을 제외한 모든 챌린지를 비활성화
  if (patch.is_active === true) {
    const { error: deErr } = await supabase
      .from('challenges')
      .update({ is_active: false })
      .neq('id', id)
    if (deErr) {
      return NextResponse.json({ message: '챌린지 수정에 실패했습니다.' }, { status: 500 })
    }
  }

  const { data, error } = await supabase
    .from('challenges')
    .update(patch)
    .eq('id', id)
    .select('id, name, start_date, end_date, is_active')
    .single()

  if (error || !data) {
    return NextResponse.json({ message: '챌린지를 찾을 수 없습니다.' }, { status: 404 })
  }
  return NextResponse.json({ challenge: data })
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
  const { error } = await supabase.from('challenges').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ message: '챌린지 삭제에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ message: '삭제되었습니다.' })
}
