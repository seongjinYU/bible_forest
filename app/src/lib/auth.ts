import { cookies } from 'next/headers'
import { createSupabaseServerClient } from './supabase'
import type { User } from '@/types/database'

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value
  if (!userId) return null

  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return data ?? null
}
