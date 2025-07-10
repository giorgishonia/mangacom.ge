import { supabaseAdmin } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function getAuthUserId(request: Request): Promise<string | null> {
  // 1. Authorization: Bearer token header
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && data.user) return data.user.id
    } catch {}
  }
  // 2. Supabase cookie via helpers
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) return session.user.id
  } catch {}
  return null
} 