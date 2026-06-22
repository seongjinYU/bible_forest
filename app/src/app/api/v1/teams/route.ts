import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// 콜드스타트 완화: 읽기 전용·병렬 1왕복 → Edge 전환. (리전 미지정 = 사용자 근처 실행)
export const runtime = 'edge'

export async function GET() {
  const supabase = createSupabaseServerClient()

  const [{ data: teams }, { data: users }, { data: trees }] = await Promise.all([
    supabase.from('teams').select('id, name'),
    supabase.from('users').select('id, team_id'),
    supabase.from('trees').select('team_id, points'),
  ])

  if (!teams) {
    return NextResponse.json({ message: '팀 정보를 불러올 수 없습니다.' }, { status: 500 })
  }

  const result = teams
    .map((team: { id: string; name: string }) => {
      const teamUsers = users?.filter((u: { team_id: string }) => u.team_id === team.id) ?? []
      const teamTrees = trees?.filter((t: { team_id: string; points: number }) => t.team_id === team.id) ?? []
      const total_score = teamTrees.reduce((sum: number, t: { points: number }) => sum + t.points, 0)
      return {
        id: team.id,
        name: team.name,
        member_count: teamUsers.length,
        tree_count: teamTrees.length,
        total_score,
      }
    })
    .sort((a: { total_score: number }, b: { total_score: number }) => b.total_score - a.total_score)

  return NextResponse.json({ teams: result })
}
