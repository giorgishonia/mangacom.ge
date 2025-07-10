import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET – returns current user's top list (joined with content)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let userId = session?.user?.id
  if (!userId) {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: userData } = await supabase.auth.getUser(token)
      userId = userData?.user?.id || null
    }
  }

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_top_list')
    .select('position, content:content(*)')
    .eq('user_id', userId)
    .order('position')

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }

  return NextResponse.json({ success: true, list: data })
}

// POST – upsert an item { contentId, contentType, position }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let userId = session?.user?.id
  if (!userId) {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: userData } = await supabase.auth.getUser(token)
      userId = userData?.user?.id || null
    }
  }

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { contentId, contentType, position } = body
  if (!contentId || !contentType || !position) {
    return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 })
  }

  const { error } = await supabase.from('user_top_list').upsert({
    user_id: userId,
    content_id: contentId,
    content_type: contentType,
    position,
  })

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE – remove an item at given position
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let userId = session?.user?.id
  if (!userId) {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: userData } = await supabase.auth.getUser(token)
      userId = userData?.user?.id || null
    }
  }

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { position } = body
  if (!position) {
    return NextResponse.json({ success: false, error: 'Missing position' }, { status: 400 })
  }

  const { error } = await supabase.from('user_top_list')
    .delete()
    .eq('user_id', userId)
    .eq('position', position)

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
} 