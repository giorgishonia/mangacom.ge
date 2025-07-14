import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Admin client check:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!serviceRoleKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: serviceRoleKey?.length || 0
  });
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role environment variables')
  }
  
  return createSupabaseClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

// Comment schema for validation
const commentSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(['anime', 'manga', 'comics']),
  text: z.string().min(1).max(2000),
  mediaUrl: z.string().optional().nullable(),
  parentCommentId: z.string().optional().nullable()
})

export async function GET(request: Request) {
  // Use Supabase for authentication
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const { searchParams } = new URL(request.url)
  const contentId = searchParams.get('contentId')
  const contentType = searchParams.get('contentType')

  if (!contentId || !contentType) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  try {
    // In a real implementation, you would fetch comments from your database
    // Example: const comments = await db.comments.findMany({ where: { contentId, contentType } })
    
    // For now, we'll return mock data
    const mockComments = [
      {
        id: '1',
        userId: 'user1',
        userName: 'Shota Rustaveli',
        userImage: 'https://i.pravatar.cc/150?img=1',
        contentId,
        text: 'This is amazing! I love how they adapted the manga.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Nino Chkheidze',
        userImage: 'https://i.pravatar.cc/150?img=5',
        contentId,
        text: 'The animation quality is top-notch. Can\'t wait for the next episode!',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      }
    ]

    return NextResponse.json({ comments: mockComments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Error fetching comments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Try multiple ways to get user authentication
  let userId = null;
  let session = null;

  // Method 1: Check Authorization header for Bearer token
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const supabaseWithToken = createClient();
      const { data: { user }, error } = await supabaseWithToken.auth.getUser(token);
      if (user && !error) {
        userId = user.id;
        console.log('POST /api/comments - Auth via Bearer token successful:', {
          hasUserId: !!userId,
          userEmail: user.email?.substring(0, 5) + '...' || 'none'
        });
      }
    } catch (tokenError) {
      console.warn('Failed to verify Bearer token:', tokenError);
    }
  }

  // Method 2: Fall back to session-based auth if Bearer token didn't work
  if (!userId) {
    const supabase = createClient();
    const { data: { session: sessionData } } = await supabase.auth.getSession();
    session = sessionData;
    userId = session?.user?.id;
    
    console.log('POST /api/comments - Auth via session:', {
      hasSession: !!session,
      hasUserId: !!userId,
      userEmail: session?.user?.email?.substring(0, 5) + '...' || 'none'
    });
  }

  if (!userId) {
    console.log('No user ID found via any method, returning 401');
    return NextResponse.json({ 
      error: 'Authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json()
    
    // Validate input
    const result = commentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid comment data', details: result.error.format() },
        { status: 400 }
      )
    }
    
    const { contentId, contentType, text } = result.data
    const { mediaUrl, parentCommentId } = result.data

    // Insert into database using service-role client to bypass RLS constraints safely

    let supabaseAdmin;
    try {
      supabaseAdmin = getAdminClient();
    } catch (adminError) {
      console.error('Failed to create admin client:', adminError);
      // Fall back to regular client with user auth
      supabaseAdmin = supabase;
    }

    const insertPayload: any = {
      user_id: userId,
      content_id: contentId,
      content_type: contentType.toLowerCase(),
      text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (mediaUrl) insertPayload.media_url = mediaUrl;
    if (parentCommentId) insertPayload.parent_comment_id = parentCommentId;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('comments')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      
      // If RLS error and we used regular client, provide helpful error message
      if (insertError.code === '42501' && supabaseAdmin === supabase) {
        return NextResponse.json({ 
          error: 'Authentication required. Please log out and log back in.' 
        }, { status: 403 });
      }
      
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Fetch user profile data to attach to the comment
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url, vip_status, vip_theme, comment_background_url')
      .eq('id', userId)
      .single();

    if (profileError && !profileError.message.includes('No rows found')) {
      console.warn('Error fetching profile for new comment:', profileError);
    }

    // Helper function to get correct avatar URL (same as in comments.ts)
    function getSupabaseAvatarUrl(userId: string | null, providedAvatarUrl: string | null | undefined): string | null {
      if (!userId) return null;
      const avatarUrl = providedAvatarUrl ?? null;

      // If profile already stores a full URL, just return it.
      if (avatarUrl && avatarUrl.trim() !== '') {
        if (/^https?:\/\//.test(avatarUrl)) {
          return avatarUrl;
        }
        if (avatarUrl.includes('/public/') || avatarUrl.includes('avatars/public')) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
          return `${supabaseUrl}/storage/v1/object/${avatarUrl.replace(/^\//, '')}`;
        }
        return null;
      }

      // Use DiceBear as fallback
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
    }

    // Attach profile data to the comment
    const commentWithProfile = {
      ...inserted,
      user_profile: profile ? {
        username: profile.username || 'მომხმარებელი',
        avatar_url: getSupabaseAvatarUrl(userId, profile.avatar_url),
        vip_status: profile.vip_status || false,
        vip_theme: profile.vip_theme || null,
        comment_background_url: profile.comment_background_url || null
      } : {
        username: 'მომხმარებელი',
        avatar_url: getSupabaseAvatarUrl(userId, null),
        vip_status: false,
        vip_theme: null,
        comment_background_url: null
      }
    };

    return NextResponse.json({ comment: commentWithProfile }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Error creating comment' },
      { status: 500 }
    )
  }
} 