import { cookies } from 'next/headers'

// admin_session 쿠키로 어드민 여부를 확인한다. (POST /api/v1/admin/login 이 발급)
export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'true'
}
