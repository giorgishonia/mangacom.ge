import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '../utils'
import { getFriendsAndRequests } from '@/lib/friends'

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request as unknown as Request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = request.nextUrl.searchParams.get('status') as 'accepted' | 'pending' | null
  const res = await getFriendsAndRequests(userId, status || undefined)
  if (!res.success) return NextResponse.json({ error: res.error }, { status: 500 })

  return NextResponse.json(res.data)
} 