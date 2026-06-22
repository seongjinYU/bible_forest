import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'

// 콜드스타트 완화: 홈 화면이 매번 호출하는 읽기 전용 라우트 → Edge 전환.
export const runtime = 'edge'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  const [{ data: team }, { data: trees }] = await Promise.all([
    supabase.from('teams').select('name').eq('id', user.team_id).single(),
    supabase.from('trees').select('points').eq('user_id', user.id),
  ])

  const my_score = trees?.reduce((sum: number, t: { points: number }) => sum + t.points, 0) ?? 0

  return NextResponse.json({
    id: user.id,
    nickname: user.nickname,
    team_id: user.team_id,
    team_name: team?.name ?? '',
    trees_earned: user.trees_earned,
    special_tree_earned: user.special_tree_earned,
    my_score,
  })
}
