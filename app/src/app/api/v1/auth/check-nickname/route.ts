import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// 읽기 전용 조회 → Edge.
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')
  const nickname = (searchParams.get('nickname') ?? '').trim()

  if (!teamId || !nickname) {
    return NextResponse.json({ message: 'team_id와 nickname이 필요합니다.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('team_id', teamId)
    .eq('nickname', nickname)
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ exists: !!data })
}
