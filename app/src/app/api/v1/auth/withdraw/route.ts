import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'

export async function DELETE() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('users').delete().eq('id', user.id)

  if (error) {
    return NextResponse.json({ message: '탈퇴에 실패했습니다.' }, { status: 500 })
  }

  const cookieStore = await cookies()
  cookieStore.delete('user_id')

  return NextResponse.json({ message: '탈퇴가 완료되었습니다.' })
}
