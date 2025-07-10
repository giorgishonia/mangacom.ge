import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getSupabaseAvatarUrl } from '@/lib/comments'

interface OperationResult {
  success: boolean
  error?: any
}

// Helper to get Supabase server-side client
function getSupabase() {
  return createClient()
}

async function fetchUsername(userId: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('fetchUsername error', error)
    return null
  }
  return data?.username ?? null
}

export async function sendFriendRequest(
  requesterId: string,
  targetId: string,
  requesterUsername?: string | null
): Promise<OperationResult> {
  if (requesterId === targetId) {
    return { success: false, error: 'Cannot add yourself.' }
  }
  const supabase = getSupabase()
  const supabaseSrv = supabaseAdmin

  // Check existing relationship (both directions)
  const { data: existing, error: existErr } = await supabase
    .from('friends')
    .select('status, user_id, friend_id')
    .or(`and(user_id.eq.${requesterId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${requesterId})`)
    .maybeSingle()

  if (existErr) return { success: false, error: existErr.message }

  if (existing) {
    if (existing.status === 'accepted') {
      return { success: false, error: 'Already friends.' }
    }
    // If target already sent a request, auto-accept
    if (existing.user_id === targetId && existing.status === 'pending') {
      const { error: updErr } = await supabaseSrv
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', targetId)
        .eq('friend_id', requesterId)

      if (updErr) return { success: false, error: updErr.message }

      // Ensure we have sender username for notification
      let senderName = requesterUsername
      if (!senderName) {
        senderName = await fetchUsername(requesterId)
      }

      // notify both users
      const targetUsername = await fetchUsername(targetId)
      await createNotification(targetId, 'friend_accept', { sender_user_id: requesterId, sender_username: senderName || undefined })
      await createNotification(requesterId, 'friend_accept', { sender_user_id: targetId, sender_username: targetUsername || undefined })
      return { success: true }
    }
    return { success: false, error: 'Request already pending.' }
  }

  // Insert pending request
  const { error } = await supabaseSrv.from('friends').insert({ user_id: requesterId, friend_id: targetId })
  if (error) return { success: false, error: error.message }

  // Ensure we have sender username for notification
  let senderName = requesterUsername
  if (!senderName) {
    senderName = await fetchUsername(requesterId)
  }

  // Notify recipient
  await createNotification(targetId, 'friend_request', { sender_user_id: requesterId, sender_username: senderName || undefined })

  return { success: true }
}

export async function respondToFriendRequest(
  currentUserId: string,
  requesterId: string,
  action: 'accept' | 'decline'
): Promise<OperationResult> {
  const supabase = getSupabase()
  const supabaseSrv = supabaseAdmin

  if (action === 'accept') {
    const { error } = await supabaseSrv
      .from('friends')
      .update({ status: 'accepted' })
      .eq('user_id', requesterId)
      .eq('friend_id', currentUserId)
    if (error) return { success: false, error: error.message }

    const currentUsername = await fetchUsername(currentUserId)
    await createNotification(requesterId, 'friend_accept', { sender_user_id: currentUserId, sender_username: currentUsername || undefined })

    // Mark the original friend_request notification as read for currentUserId
    await supabaseSrv
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUserId)
      .eq('sender_user_id', requesterId)
      .eq('type', 'friend_request')
    return { success: true }
  }
  // decline: delete row
  const { error } = await supabaseSrv
    .from('friends')
    .delete()
    .eq('user_id', requesterId)
    .eq('friend_id', currentUserId)
  if (error) return { success: false, error: error.message }

  // Mark original friend_request notification as read
  await supabaseSrv
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', currentUserId)
    .eq('sender_user_id', requesterId)
    .eq('type', 'friend_request')

  return { success: true }
}

export async function getFriendsAndRequests(
  userId: string,
  status?: 'accepted' | 'pending'
) {
  const supabase = getSupabase()

  // collect incoming & outgoing rows
  let query = supabase
    .from('friends')
    .select('user_id, friend_id, status, created_at')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return { success: false, error: error.message }

  const pending: any[] = []
  const accepted: any[] = []

  data!.forEach((row) => {
    const otherId = row.user_id === userId ? row.friend_id : row.user_id
    if (row.status === 'accepted') accepted.push(otherId)
    else pending.push({ from: row.user_id, to: row.friend_id })
  })

  return { success: true, data: { pending, accepted } }
}

export async function removeFriend(userId: string, targetId: string): Promise<OperationResult> {
  const supabase = getSupabase()
  const supabaseSrv = supabaseAdmin

  try {
    // Delete the friendship regardless of direction
    const { error } = await supabaseSrv
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${userId})`)

    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : err }
  }
}

// ============================
// Friend Activity Feed Helpers
// ============================

export interface FriendActivity {
  user_id: string
  username: string | null
  avatar_url: string | null
  content_id: string
  content_title: string | null
  content_thumbnail: string | null
  content_type: 'manga' | 'comics'
  activity_type: 'progress' | 'rating' | 'comment'
  status?: string            // reading / completed (for progress)
  progress?: number | null    // chapter number or page progress
  rating?: number | null      // numeric rating 1-10 or emoji index
  comment_text?: string | null // when activity_type==='comment'
  updated_at: string
}

/**
 * Fetch the latest activity from a user's friends (reading progress, ratings, completions).
 * Uses the service-role key on the server to bypass RLS so that friends can view each other's activity.
 * @param userId The current user ID
 * @param limit  Maximum number of items to return (default 20)
 */
export async function getFriendActivities(
  userId: string,
  limit: number = 20
): Promise<{ success: boolean; data?: FriendActivity[]; error?: any }> {
  try {
    // 1. Collect accepted friend IDs (both directions)
    const { data: friendRows, error: friendErr } = await supabaseAdmin
      .from('friends')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    if (friendErr) return { success: false, error: friendErr.message }

    // Map the rows to the other user id
    const friendIds = (friendRows || []).map((row: any) =>
      row.user_id === userId ? row.friend_id : row.user_id
    )

    if (friendIds.length === 0) return { success: true, data: [] }

    // 2. Fetch recent watchlist updates from friends
    const { data: activityRows, error: actErr } = await supabaseAdmin
      .from('watchlist')
      .select('id, user_id, status, progress, rating, updated_at, content_id')
      .in('user_id', friendIds)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (actErr) return { success: false, error: actErr.message }

    // New: fetch recent comments by friends
    const { data: commentRows, error: comErr } = await supabaseAdmin
      .from('comments')
      .select('id, user_id, text, created_at, content_id, content_type')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (comErr) return { success: false, error: comErr.message }

    if (!activityRows) return { success: true, data: [] }

    // 3. Fetch profiles for involved friend IDs (single query)
    const allRows = [...activityRows, ...(commentRows || [])]
    const uniqueIds = Array.from(new Set(allRows.map((r: any) => r.user_id)))
    const { data: profileRows, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', uniqueIds)

    if (profErr) return { success: false, error: profErr.message }

    const profileMap: Record<string, { username: string | null; avatar_url: string | null }> = {}
    ;(profileRows || []).forEach((p: any) => {
      profileMap[p.id] = { username: p.username, avatar_url: getSupabaseAvatarUrl(p.id, p.avatar_url) }
    })

    // -------- fetch content rows --------
    const contentIdsSet = new Set<string>()
    activityRows.forEach((r:any)=> contentIdsSet.add(r.content_id))
    ;(commentRows||[]).forEach((r:any)=> contentIdsSet.add(r.content_id))

    const contentIdsArr = Array.from(contentIdsSet)
    let contentMap: Record<string, { title: string|null; thumbnail:string|null; type:'manga'|'comics'}> = {}
    if(contentIdsArr.length){
      const { data: cRows, error: cErr } = await supabaseAdmin
        .from('content')
        .select('id, title, thumbnail, type')
        .in('id', contentIdsArr)
      if(cErr) return { success:false, error:cErr.message }
      (cRows||[]).forEach((c:any)=> {
        contentMap[c.id] = { title:c.title, thumbnail:c.thumbnail, type:c.type }
      })
    }

    const feed: FriendActivity[] = []

    // Watchlist rows (progress / rating)
    activityRows.forEach((row: any) => {
      const prof = profileMap[row.user_id] || { username: null, avatar_url: null }
      const type: 'progress' | 'rating' = row.rating && row.rating > 0 ? 'rating' : 'progress'
      const contentInfo = contentMap[row.content_id] || { title:null, thumbnail:null, type:'manga'}
      feed.push({
        user_id: row.user_id,
        username: prof.username,
        avatar_url: prof.avatar_url,
        content_id: row.content_id,
        content_title: contentInfo.title,
        content_thumbnail: contentInfo.thumbnail,
        content_type: contentInfo.type,
        activity_type: type,
        status: row.status,
        progress: row.progress,
        rating: row.rating,
        updated_at: row.updated_at,
      })
    })

    // Comment rows
    ;(commentRows || []).forEach((row: any) => {
      const prof = profileMap[row.user_id] || { username: null, avatar_url: null }
      const contentInfo = contentMap[row.content_id] || { title:null, thumbnail:null, type:'manga' }
      feed.push({
        user_id: row.user_id,
        username: prof.username,
        avatar_url: prof.avatar_url,
        content_id: row.content_id,
        content_title: contentInfo.title,
        content_thumbnail: contentInfo.thumbnail,
        content_type: contentInfo.type,
        activity_type: 'comment',
        comment_text: row.text,
        updated_at: row.created_at,
      })
    })

    // Sort combined feed by updated_at desc and limit
    feed.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    const limitedFeed = feed.slice(0, limit)

    return { success: true, data: limitedFeed }
  } catch (error) {
    console.error('getFriendActivities error', error)
    return { success: false, error }
  }
}

export interface FriendStatus {
  user_id: string
  username: string | null
  avatar_url: string | null
  status: string // reading, completed, etc.
}

/**
 * Return watchlist status of the current user's friends for a specific content.
 */
export async function getFriendStatusesForContent(
  userId: string,
  contentId: string
): Promise<{ success: boolean; data?: FriendStatus[]; error?: any }> {
  try {
    // 1. Fetch accepted friend ids
    const { data: friendRows, error: friendErr } = await supabaseAdmin
      .from('friends')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    if (friendErr) return { success: false, error: friendErr.message }

    const friendIds = (friendRows || []).map((row: any) =>
      row.user_id === userId ? row.friend_id : row.user_id
    )
    if (friendIds.length === 0) return { success: true, data: [] }

    // 2. Fetch watchlist rows for those friends & contentId (no join)
    const { data: rows, error: wlErr } = await supabaseAdmin
      .from('watchlist')
      .select('user_id, status')
      .eq('content_id', contentId)
      .in('user_id', friendIds)

    if (wlErr) return { success: false, error: wlErr.message }

    if (!rows || rows.length === 0) return { success: true, data: [] }

    // 3. Fetch profiles for those users
    const uniqueIds = Array.from(new Set(rows.map((r: any) => r.user_id)))
    const { data: profileRows, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', uniqueIds)

    if (profErr) return { success: false, error: profErr.message }

    const profileMap: Record<string, { username: string | null; avatar_url: string | null }> = {}
    ;(profileRows || []).forEach((p: any) => {
      profileMap[p.id] = { username: p.username, avatar_url: getSupabaseAvatarUrl(p.id, p.avatar_url) }
    })

    const statuses: FriendStatus[] = rows.map((r: any) => {
      const prof = profileMap[r.user_id] || { username: null, avatar_url: null }
      return {
        user_id: r.user_id,
        username: prof.username,
        avatar_url: prof.avatar_url,
        status: r.status,
      }
    })

    return { success: true, data: statuses }
  } catch (error) {
    console.error('getFriendStatusesForContent error', error)
    return { success: false, error }
  }
} 