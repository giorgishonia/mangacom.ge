import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUserId } from '../utils'
import { removeFriend } from '@/lib/friends'

const schema = z.object({
  targetId: z.string().uuid(),
})

export async function POST(request: Request) {
  const userId = await getAuthUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { targetId } = parsed.data
  const res = await removeFriend(userId, targetId)
  if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 })

  return NextResponse.json({ success: true })
} 