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
      supabase.from('users').select('id, team_id, nickname'),
      supabase.from('bible_progress').select('user_id'),
      supabase.from('trees').select('team_id, user_id, points'),
    ])

  if (!teams) {
    return NextResponse.json({ message: '데이터를 불러올 수 없습니다.' }, { status: 500 })
  }

  // ── 팀별 집계 ──
  const teamStats = teams.map((team: { id: string; name: string }) => {
    const teamUsers = users?.filter((u: { id: string; team_id: string }) => u.team_id === team.id) ?? []
    const teamUserIds = new Set(teamUsers.map((u: { id: string }) => u.id))
    const chapters_checked = bibleProgress?.filter((bp: { user_id: string }) => teamUserIds.has(bp.user_id)).length ?? 0
    const maxPossible = teamUsers.length * TOTAL_NT_CHAPTERS
    const progress_rate = maxPossible > 0 ? Math.round((chapters_checked / maxPossible) * 100) : 0
    const teamTrees = trees?.filter((t: { team_id: string }) => t.team_id === team.id) ?? []
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

  // ── 개인별 집계 (랭킹용) — 읽은 장 수 내림차순 ──
  const teamNameById = new Map<string, string>(
    teams.map((t: { id: string; name: string }) => [t.id, t.name] as [string, string]),
  )
  const members = (users ?? [])
    .map((u: { id: string; team_id: string; nickname: string }) => ({
      user_id: u.id,
      nickname: u.nickname,
      team_name: teamNameById.get(u.team_id) ?? '',
      chapters_checked: bibleProgress?.filter((bp: { user_id: string }) => bp.user_id === u.id).length ?? 0,
      tree_count: trees?.filter((t: { user_id: string }) => t.user_id === u.id).length ?? 0,
    }))
    .sort((a, b) => b.chapters_checked - a.chapters_checked)

  return NextResponse.json({
    total_users: users?.length ?? 0,
    teams: teamStats,
    members,
  })
}
