import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '../../utils'
import { getFriendStatusesForContent } from '@/lib/friends'

export async function GET(req: NextRequest, { params }: { params: { contentId: string } }) {
  const userId = await getAuthUserId(req as unknown as Request)
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const contentId = params.contentId
  if (!contentId) return NextResponse.json({ success: false, error: 'Missing contentId' }, { status: 400 })

  const res = await getFriendStatusesForContent(userId, contentId)
  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, statuses: res.data })
} 