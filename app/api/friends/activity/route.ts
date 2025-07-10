import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '../utils'
import { getFriendActivities } from '@/lib/friends'

// GET /api/friends/activity?limit=20 – returns a feed of recent friend activities for the authenticated user
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request as unknown as Request)
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam))) : 20

  const res = await getFriendActivities(userId, limit)
  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, activities: res.data })
} 