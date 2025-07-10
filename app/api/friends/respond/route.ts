import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUserId } from '../utils'
import { respondToFriendRequest } from '@/lib/friends'

const schema = z.object({
  requesterId: z.string().uuid(),
  action: z.enum(['accept', 'decline'])
})

export async function POST(request: Request) {
  const userId = await getAuthUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { requesterId, action } = parsed.data
  const res = await respondToFriendRequest(userId, requesterId, action)
  if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 })

  return NextResponse.json({ success: true })
} 