import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id

  if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 })

  // Fetch accepted friendship rows where user is involved
  const { data: rows, error } = await supabaseAdmin
    .from('friends')
    .select('user_id, friend_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!rows || rows.length === 0) {
    return NextResponse.json({ friends: [], count: 0 })
  }

  // Collect the other user ids
  const otherIds = rows.map(r => (r.user_id === userId ? r.friend_id : r.user_id))

  // Fetch basic profiles
  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', otherIds)

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })

  return NextResponse.json({ friends: profiles || [], count: profiles?.length || 0 })
} 