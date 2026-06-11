import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { TOTAL_NT_CHAPTERS } from '@/constants/bible'

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_session')?.value !== 'true') {
    return NextResponse.json({ message: '어드민 권한이 필요합니다.' }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()

  const [{ data: teams }, { data: users }, { data: bibleProgress }, { data: trees }] =
    await Promise.all([
      supabase.from('teams').select('id, name'),
      supabase.from('users').select('id, team_id'),
      supabase.from('bible_progress').select('user_id'),
      supabase.from('trees').select('team_id, points'),
    ])

  if (!teams) {
    return NextResponse.json({ message: '데이터를 불러올 수 없습니다.' }, { status: 500 })
  }

  const teamStats = teams.map((team: { id: string; name: string }) => {
    const teamUsers = users?.filter((u: { id: string; team_id: string }) => u.team_id === team.id) ?? []
    const teamUserIds = new Set(teamUsers.map((u: { id: string }) => u.id))
    const chapters_checked = bibleProgress?.filter((bp: { user_id: string }) => teamUserIds.has(bp.user_id)).length ?? 0
    const maxPossible = teamUsers.length * TOTAL_NT_CHAPTERS
    const progress_rate = maxPossible > 0 ? Math.round((chapters_checked / maxPossible) * 100) : 0
    const teamTrees = trees?.filter((t: { team_id: string; points: number }) => t.team_id === team.id) ?? []
    const total_score = teamTrees.reduce((sum: number, t: { points: number }) => sum + t.points, 0)

    return {
      team_id: team.id,
      team_name: team.name,
      member_count: teamUsers.length,
      chapters_checked,
      progress_rate,
      tree_count: teamTrees.length,
      total_score,
    }
  })

  return NextResponse.json({
    total_users: users?.length ?? 0,
    teams: teamStats,
  })
}
