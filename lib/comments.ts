import { supabase } from './supabase'
import { v5 as uuidv5 } from 'uuid'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Create a service role client that can bypass RLS
const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { 
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )
  : null

// UUID namespace for converting non-UUID IDs
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'

// Helper function to ensure UUID format
function ensureUUID(id: string): string {
  // Check if already a valid UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id
  }
  
  // Convert to a deterministic UUID using the namespace
  return uuidv5(id, NAMESPACE)
}

// Helper function to get the correct avatar URL from Supabase
export function getSupabaseAvatarUrl(
  userId: string,
  providedAvatarUrl: string | null,
): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;

  // 1. If profile already stores a full URL, just return it.
  if (providedAvatarUrl && providedAvatarUrl.trim() !== '') {
    // Already full URL → return directly
    if (/^https?:\/\//.test(providedAvatarUrl)) {
      return providedAvatarUrl;
    }

    // If it's a path that includes "public/" or "avatars/public", use storage URL
    if (providedAvatarUrl.includes('/public/') || providedAvatarUrl.includes('avatars/public')) {
      return `${supabaseUrl}/storage/v1/object/${providedAvatarUrl.replace(/^\//, '')}`;
    }
    
    // For private paths, don't attempt to construct URLs that might cause 400 errors
    return null;
  }

  // 2. If we don't have a stored avatar file for this user, use a fallback avatar service
  if (userId) {
    // Use DiceBear as a fallback avatar service - this will always work
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
  }

  // 3. If no userId either, return null to let the component use its own fallback
  return null;
}

export interface Comment {
  id: string
  user_id: string
  content_id: string
  content_type: 'MANGA' | 'COMICS' | 'manga' | 'comics'
  text: string
  media_url?: string
  created_at: string
  updated_at: string
  parent_comment_id?: string | null
  user_profile?: {
    username: string | null
    avatar_url: string | null
    vip_status?: boolean
    vip_theme?: string | undefined
    comment_background_url?: string | null | undefined
  }
  like_count?: number;
  user_has_liked?: boolean;
  replies?: Comment[];
}

// Check if the comments table exists and has the right structure
export async function ensureCommentsTable() {
  try {
    // First check if we can access the media_url column
    const { error } = await supabase
      .from('comments')
      .select('media_url')
      .limit(1);
    
    // If there's no error, the table structure is good, but we still need to check content_type constraints
    if (!error) {
      // Try to insert a test comment with lowercase content_type to check if constraint accepts it
      const testComment = {
        user_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
        content_id: 'test',
        content_type: 'comics', // Use lowercase to test constraint aligned with allowed values
        text: 'Test comment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error: testError } = await supabase
        .from('comments')
        .insert(testComment)
        .select()
        .single();
      
      // If no error or error is not related to content_type constraint, then we're good
      if (!testError || !testError.message.includes('violates check constraint')) {
        // Delete the test comment if it was successfully inserted
        if (!testError) {
          await supabase
            .from('comments')
            .delete()
            .eq('content_id', 'test')
            .eq('user_id', '00000000-0000-0000-0000-000000000000');
        }
        
        return { success: true, message: "Comments table exists and has the correct structure" };
      }
      
      // If we get here, there's an issue with the content_type constraint
      console.warn("Comments table has issues with content_type constraint, attempting to fix...");
      
      // First try hitting the general fix route we maintain under /api/setup/fix-comments-table
      try {
        const res = await fetch('/api/setup/fix-comments-table');
        const data = await res.json();
        if (data.success) {
          console.log('Successfully fixed comments table via setup route.');
          return { success: true, message: 'Comments table fixed via setup route' };
        }
        console.warn('Setup route did not fix table, falling back to legacy fixCommentsTable logic.', data);
      } catch(fetchErr) {
        console.error('Error calling setup fix-comments-table route:', fetchErr);
      }

      // Fallback: Import and run legacy fix function (may rely on DB RPC)
      try {
      const { fixCommentsTable } = await import('./ensureCommentsContentType');
      const fixResult = await fixCommentsTable();
      return fixResult;
      } catch(importErr) {
        console.error('Failed to run legacy fixCommentsTable:', importErr);
        return { success: false, error: 'Unable to fix comments table automatically.' } as any;
      }
    }
    
    // If there's a specific error about the media_url column not existing,
    // redirect to the fix endpoint
    if (error.message.includes("Could not find the 'media_url' column")) {
      console.warn("Comments table is missing media_url column, attempting to fix...");
      
      // Try to fix it through the API endpoint
      const response = await fetch('/api/setup/fix-comments-table');
      const data = await response.json();
      
      return data;
    }
    
    // For other errors, just report them
    return { success: false, error: error.message };
  } catch (err) {
    console.error("Error checking comments table:", err);
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: String(err) };
  }
}

// Fetch comments for a specific content
export async function getCommentsByContentId(
  contentId: string,
  contentType: 'manga' | 'comics'
) {
  try {
    // Normalize content_type to ensure it matches database constraints
    let normalizedContentType = contentType.toLowerCase().trim();
    
    // Log the input content type and normalized content type
    console.log(`Getting comments by content ID with raw content type: "${contentType}", normalized to: "${normalizedContentType}"`);
    
    // First try with uppercase (which is what the database probably expects)
    let normalizedUppercaseType = normalizedContentType.toUpperCase();
    if (normalizedContentType === 'comic') {
      normalizedUppercaseType = 'COMICS';
    }
    
    console.log(`Trying with uppercase content type: "${normalizedUppercaseType}"`);
    
    // Use the public client for reading (RLS should allow reads)
    let { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('content_id', contentId)
      .eq('content_type', normalizedUppercaseType)
      .order('created_at', { ascending: false });

    // If first query fails or returns no results, try with lowercase
    if ((error && error.message.includes('violates check constraint')) || 
        (data && data.length === 0)) {
      console.log(`No results with uppercase, trying with lowercase content type: "${normalizedContentType}"`);
      
      const lowercaseResult = await supabase
        .from('comments')
        .select('*')
        .eq('content_id', contentId)
        .eq('content_type', normalizedContentType)
        .order('created_at', { ascending: false });
        
      data = lowercaseResult.data;
      error = lowercaseResult.error;
    }

    // Third attempt: fallback to "manga" when requesting comics
    if ((error || !data || data.length === 0) && normalizedContentType === 'comics') {
      console.log('No comments with COMICS type – trying fallback type "manga"');

      const fallbackResult = await supabase
        .from('comments')
        .select('*')
        .eq('content_id', contentId)
        .eq('content_type', 'manga')
        .order('created_at', { ascending: false });

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error('Error fetching comments:', error);
      return { success: false, error, comments: [] };
    }

    // If we have comments, fetch user profiles separately
    if (data && data.length > 0) {
      // Get unique user IDs from comments
      const userIds = [...new Set(data.map(comment => comment.user_id))];
      
      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, vip_status, vip_theme, comment_background_url')
        .in('id', userIds);
      
      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
        // Continue anyway, we'll just show comments without profiles
      }
      
      // Map profiles to comments
      const commentsWithProfiles = data.map(comment => {
        const profile = profiles?.find(p => p.id === comment.user_id);
        
        // Get the correct avatar URL using the helper function
        const correctAvatarUrl = profile ? 
            getSupabaseAvatarUrl(comment.user_id, profile.avatar_url) : null;
            
        return {
          ...comment,
          user_profile: profile ? {
            username: profile.username || 'User',
            avatar_url: correctAvatarUrl,
            vip_status: profile.vip_status || false,
            vip_theme: profile.vip_theme || null,
            comment_background_url: profile.comment_background_url || null
          } : {
            username: 'User',
            avatar_url: null
          }
        };
      });
      
      return { success: true, comments: commentsWithProfiles as Comment[] };
    }

    return { success: true, comments: data as Comment[] };
  } catch (error) {
    console.error('Error fetching comments:', error);
    return { success: false, error, comments: [] };
  }
}

// Add a new comment
export async function addComment(
  userId: string,
  contentId: string,
  contentType: 'manga' | 'comics',
  text: string,
  username: string = 'User',
  avatarUrl: string | null = null,
  mediaUrl: string | null = null,
  parentCommentId: string | null = null
) {
  try {
    // Normalize content_type to ensure it matches database constraints
    let normalizedContentType = contentType.toLowerCase().trim();
    
    // Log the input content type and normalized content type
    console.log(`Adding comment with raw content type: "${contentType}", normalized to: "${normalizedContentType}"`);
    
    // We'll try both lowercase and uppercase versions to match whatever constraint is in the database
    // First try lowercase version
    let newComment = {
      user_id: ensureUUID(userId),
      content_id: contentId,
      content_type: normalizedContentType,
      text: text,
      media_url: mediaUrl,
      parent_comment_id: parentCommentId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Attempting to add comment with lowercase contentType:', {
      contentType: normalizedContentType,
      text: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
    });
    
    // First try with lowercase
    let { data, error } = await supabase
      .from('comments')
      .insert(newComment)
      .select('*')
      .single();

    // If we get a constraint error, try uppercase instead
    if (error && error.message.includes('violates check constraint')) {
      console.log('Constraint violation with lowercase, trying uppercase...');
      
      // Update to uppercase content_type
      newComment.content_type = normalizedContentType.toUpperCase();
      
      console.log('Attempting to add comment with uppercase contentType:', {
        contentType: newComment.content_type,
        text: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
      });
      
      // Try again with uppercase
      const result = await supabase
        .from('comments')
        .insert(newComment)
        .select('*')
        .single();
      
      data = result.data;
      error = result.error;
    }

    // Final fallback: if we are trying to comment on a comic and both
    // lowercase/uppercase attempts failed due to a check-constraint we
    // optimistically fall back to storing the comment as `manga`. This
    // keeps the UI functional even if the DB constraint has not yet been
    // migrated to allow the "comics" value.
    if (error && contentType.toLowerCase() === 'comics' && error.message.includes('violates check constraint')) {
      console.warn('Constraint still failing for COMICS – falling back to MANGA value for content_type');

      newComment.content_type = 'manga';

      const result = await supabase
        .from('comments')
        .insert(newComment)
        .select('*')
        .single();

      data = result.data;
      error = result.error;
    }

    // If we still have an error, report it
    if (error) {
      // Enhanced error logging for constraint violations
      if (error.message.includes('violates check constraint')) {
        console.error('Constraint violation error adding comment:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          contentType: newComment.content_type
        });
      } else {
        console.error('Error adding comment to Supabase:', error.message, error);
      }
      return { success: false, error };
    }

    // If we're here, the insert worked - proceed with fetching user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, vip_status, vip_theme, comment_background_url')
      .eq('id', newComment.user_id)
      .single();
    
    if (profileError && !profileError.message.includes('No rows found')) {
      console.warn('Error fetching profile:', profileError);
    }

    // Get the correct avatar URL
    const correctAvatarUrl = profile ? 
        getSupabaseAvatarUrl(newComment.user_id, profile.avatar_url) : 
        getSupabaseAvatarUrl(newComment.user_id, avatarUrl);

    // Return the comment with the profile data
    return { 
      success: true, 
      comment: {
        ...data,
        user_profile: profile ? {
          username: profile.username || 'User',
          avatar_url: correctAvatarUrl,
          vip_status: profile.vip_status || false,
          vip_theme: profile.vip_theme || null,
          comment_background_url: profile.comment_background_url || null
        } : {
          username: username || 'User',
          avatar_url: correctAvatarUrl
        }
      } as Comment
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error };
  }
}

// Delete a comment
export async function deleteComment(commentId: string, userId: string) {
  try {
    // Ensure userId is in UUID format
    const formattedUserId = ensureUUID(userId)
    
    // Use public client - may run into RLS issues
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', formattedUserId)
    
    if (error) {
      console.error('Error deleting comment:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return { success: false, error }
  }
}

// Update a comment
export async function updateComment(
  commentId: string,
  userId: string,
  text: string,
  mediaUrl: string | null = null
) {
  try {
    // Ensure userId is in UUID format
    const formattedUserId = ensureUUID(userId)
    
    // Prepare update data
    const updateData: any = { 
      text,
      updated_at: new Date().toISOString()
    }
    
    // Only include media_url if it's provided
    if (mediaUrl !== undefined) {
      updateData.media_url = mediaUrl
    }
    
    // Use public client - may run into RLS issues
    const { data, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .eq('user_id', formattedUserId)
      .select('*')
      .single()
    
    if (error) {
      console.error('Error updating comment:', error)
      return { success: false, error }
    }

    // Fetch the user's profile data separately
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, vip_status, vip_theme, comment_background_url')
      .eq('id', formattedUserId)
      .single()
    
    if (profileError) {
      console.warn('Error fetching profile:', profileError)
    }

    // Get the correct avatar URL
    const correctAvatarUrl = profile ? 
        getSupabaseAvatarUrl(formattedUserId, profile.avatar_url) : null;

    // Return the comment with the profile data
    return { 
      success: true, 
      comment: {
        ...data,
        user_profile: profile ? {
          username: profile.username || 'User',
          avatar_url: correctAvatarUrl,
          vip_status: profile.vip_status || false,
          vip_theme: profile.vip_theme || null,
          comment_background_url: profile.comment_background_url || null
        } : {
          username: 'User',
          avatar_url: null
        }
      } as Comment 
    }
  } catch (error) {
    console.error('Error updating comment:', error)
    return { success: false, error }
  }
}

// Get replies for a comment
export async function getCommentReplies(commentId: string) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comment replies:', error);
      return { success: false, error, replies: [] };
    }

    // If we have replies, fetch user profiles
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(reply => reply.user_id))];
      
      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, vip_status, vip_theme, comment_background_url')
        .in('id', userIds);
      
      if (profilesError) {
        console.warn('Error fetching profiles for replies:', profilesError);
      }
      
      // Map profiles to replies
      const repliesWithProfiles = data.map(reply => {
        const profile = profiles?.find(p => p.id === reply.user_id);
        return {
          ...reply,
          user_profile: profile ? {
            username: profile.username || 'User',
            avatar_url: profile.avatar_url || null,
            vip_status: profile.vip_status || false,
            vip_theme: profile.vip_theme || null,
            comment_background_url: profile.comment_background_url || null
          } : {
            username: 'User',
            avatar_url: null
          }
        };
      });
      
      return { success: true, replies: repliesWithProfiles as Comment[] };
    }

    return { success: true, replies: data as Comment[] };
  } catch (error) {
    console.error('Error fetching comment replies:', error);
    return { success: false, error, replies: [] };
  }
}

// Fetch all comments for a specific content with their replies
export async function getAllComments(
  contentId: string,
  contentType: 'manga' | 'comics',
  userId?: string | null
) {
  try {
    // Normalize content_type to ensure it matches database constraints
    let normalizedContentType = contentType.toLowerCase().trim();
    
    // Log the input content type and normalized content type
    console.log(`Getting comments with raw content type: "${contentType}", normalized to: "${normalizedContentType}"`);
    
    // First try with uppercase (which is what the database probably expects)
    let normalizedUppercaseType = normalizedContentType.toUpperCase();
    if (normalizedContentType === 'comic') {
      normalizedUppercaseType = 'COMICS';
    }
    
    console.log(`Trying with uppercase content type: "${normalizedUppercaseType}"`);

    // Ensure userId is UUID if provided
    const formattedUserId = userId ? ensureUUID(userId) : null;
    
    // First try to get comments with parent_comment_id filter using UPPERCASE content type
    try {
      // Get only the top-level comments (those without a parent_comment_id)
      let { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('content_id', contentId)
        .eq('content_type', normalizedUppercaseType)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      // If first query fails or returns no results, try with lowercase
      if ((error && !error.message.includes('parent_comment_id')) || (data && data.length === 0)) {
        console.log(`No results with uppercase, trying with lowercase content type: "${normalizedContentType}"`);
        
        const lowercaseResult = await supabase
          .from('comments')
          .select('*')
          .eq('content_id', contentId)
          .eq('content_type', normalizedContentType)
          .is('parent_comment_id', null)
          .order('created_at', { ascending: false });
          
        data = lowercaseResult.data;
        error = lowercaseResult.error;
      }

      if (error) {
        // If the error is about the parent_comment_id column not existing,
        // we'll fall back to the simpler query below
        if (error.code === '42703' && error.message.includes('parent_comment_id')) {
          throw new Error('parent_comment_id column does not exist');
        }
        
        console.error('Error fetching comments:', error);
        return { success: false, error, comments: [] };
      }

      // If we have top-level comments, fetch their replies and user profiles
      if (data && data.length > 0) {
        // Get all top-level comment IDs to fetch their replies
        const commentIds = data.map(comment => comment.id);
        
        // Try to fetch all replies for these comments, first with uppercase
        try {
          let { data: allReplies, error: repliesError } = await supabase
            .from('comments')
            .select('*')
            .eq('content_id', contentId)
            .eq('content_type', normalizedUppercaseType)
            .in('parent_comment_id', commentIds)
            .order('created_at', { ascending: true });
          
          // If first query for replies fails or returns no results, try with lowercase
          if ((repliesError && !repliesError.message.includes('parent_comment_id')) || 
              (!allReplies || allReplies.length === 0)) {
            console.log(`No replies with uppercase, trying with lowercase content type: "${normalizedContentType}"`);
            
            const lowercaseRepliesResult = await supabase
              .from('comments')
              .select('*')
              .eq('content_id', contentId)
              .eq('content_type', normalizedContentType)
              .in('parent_comment_id', commentIds)
              .order('created_at', { ascending: true });
              
            allReplies = lowercaseRepliesResult.data;
            repliesError = lowercaseRepliesResult.error;
          }
          
          if ((repliesError || !allReplies || allReplies.length === 0) && normalizedContentType === 'comics') {
            console.log('No replies with COMICS type – attempting fallback "manga" type');

            const fallbackRepliesResult = await supabase
              .from('comments')
              .select('*')
              .eq('content_id', contentId)
              .eq('content_type', 'manga')
              .in('parent_comment_id', commentIds)
              .order('created_at', { ascending: true });

            allReplies = fallbackRepliesResult.data;
            repliesError = fallbackRepliesResult.error;
          }
          
          if (repliesError) {
            console.warn('Error fetching replies:', repliesError);
          }
          
          // Get unique user IDs from both comments and replies
          const userIds = [...new Set([
            ...data.map(comment => comment.user_id),
            ...(allReplies?.map(reply => reply.user_id) || [])
          ])];
          
          // Fetch all user profiles
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, vip_status, vip_theme, comment_background_url')
            .in('id', userIds);
          
          if (profilesError) {
            console.warn('Error fetching profiles:', profilesError);
          }
          
          // Get all comment and reply IDs for like fetching
          const allCommentIds = [
            ...data.map(c => c.id),
            ...(allReplies?.map(r => r.id) || [])
          ];
          
          let likesData: any[] = [];
          let userLikesSet = new Set<string>();

          if (allCommentIds.length > 0) {
            // Fetch like counts for all comments/replies
            const { data: likeCounts, error: countError } = await supabase
              .from('comment_likes')
              .select('comment_id, user_id') // Select user_id to count
              .in('comment_id', allCommentIds);

            if (countError) {
              console.warn('Error fetching like counts:', countError);
            } else if (likeCounts) {
              // Calculate counts per comment_id
              const counts: Record<string, number> = {};
              likeCounts.forEach(like => {
                counts[like.comment_id] = (counts[like.comment_id] || 0) + 1;
              });
              likesData = Object.entries(counts).map(([comment_id, count]) => ({ comment_id, like_count: count }));
            }

            // Fetch likes for the current user if userId is provided
            if (formattedUserId) {
              const { data: userLikes, error: userLikesError } = await supabase
                .from('comment_likes')
                .select('comment_id')
                .eq('user_id', formattedUserId)
                .in('comment_id', allCommentIds);

              if (userLikesError) {
                console.warn('Error fetching user likes:', userLikesError);
              } else if (userLikes) {
                userLikes.forEach(like => userLikesSet.add(like.comment_id));
              }
            }
          }
          
          // Group replies by parent comment ID
          const repliesByParentId: Record<string, Comment[]> = {};
          
          if (allReplies) {
            allReplies.forEach(reply => {
              const parentId = reply.parent_comment_id;
              if (parentId) {
                if (!repliesByParentId[parentId]) {
                  repliesByParentId[parentId] = [];
                }
                
                // Add user profile and like info to reply
                const profile = profiles?.find(p => p.id === reply.user_id);
                const likeInfo = likesData.find(l => l.comment_id === reply.id);
                
                repliesByParentId[parentId].push({
                  ...reply,
                  user_profile: profile ? {
                    username: profile.username || 'User',
                    avatar_url: profile.avatar_url || null,
                    vip_status: profile.vip_status || false,
                    vip_theme: profile.vip_theme || null,
                    comment_background_url: profile.comment_background_url || null
                  } : {
                    username: 'User',
                    avatar_url: null
                  },
                  like_count: likeInfo?.like_count || 0,
                  user_has_liked: formattedUserId ? userLikesSet.has(reply.id) : false
                } as Comment);
              }
            });
          }
          
          // Add profiles, replies, and like info to comments
          const commentsWithProfiles = data.map(comment => {
            const profile = profiles?.find(p => p.id === comment.user_id);
            const likeInfo = likesData.find(l => l.comment_id === comment.id);
            
            return {
              ...comment,
              user_profile: profile ? {
                username: profile.username || 'User',
                avatar_url: profile.avatar_url || null,
                vip_status: profile.vip_status || false,
                vip_theme: profile.vip_theme || null,
                comment_background_url: profile.comment_background_url || null
              } : {
                username: 'User',
                avatar_url: null
              },
              replies: (repliesByParentId[comment.id] || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), // Ensure replies are sorted correctly
              like_count: likeInfo?.like_count || 0,
              user_has_liked: formattedUserId ? userLikesSet.has(comment.id) : false
            } as Comment;
          });
          
          return { success: true, comments: commentsWithProfiles };
        } catch (error) {
          console.warn('Error processing replies:', error);
          // Continue with just the comments without replies
        }
        
        // If we reach here, we have comments but couldn't process replies
        // Add just the user profiles to comments
        const userIds = [...new Set(data.map(comment => comment.user_id))];
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, vip_status, vip_theme, comment_background_url')
          .in('id', userIds);
        
        if (profilesError) {
          console.warn('Error fetching profiles:', profilesError);
        }
        
        const commentsWithProfiles = data.map(comment => {
          const profile = profiles?.find(p => p.id === comment.user_id);
          
          return {
            ...comment,
            user_profile: profile ? {
              username: profile.username || 'User',
              avatar_url: profile.avatar_url || null,
              vip_status: profile.vip_status || false,
              vip_theme: profile.vip_theme || null,
              comment_background_url: profile.comment_background_url || null
            } : {
              username: 'User',
              avatar_url: null
            },
            replies: [],
            like_count: 0,
            user_has_liked: false
          } as Comment;
        });
        
        return { success: true, comments: commentsWithProfiles };
      }

      return { success: true, comments: data as Comment[] };
    } catch (error) {
      // Fall back to simpler query if parent_comment_id column doesn't exist
      console.log('Falling back to basic comments query due to:', error);
    }
    
    // FALLBACK QUERY - Get all comments without parent filtering
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('comments')
      .select('*')
      .eq('content_id', contentId)
      .eq('content_type', normalizedContentType)
      .order('created_at', { ascending: false });
    
    if (fallbackError) {
      console.error('Error fetching comments (fallback):', fallbackError);
      return { success: false, error: fallbackError, comments: [] };
    }
    
    // Add profiles and like data in fallback mode
    if (fallbackData && fallbackData.length > 0) {
      const fallbackUserIds = [...new Set(fallbackData.map(comment => comment.user_id))];
      const { data: fallbackProfiles, error: fallbackProfilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, vip_status, vip_theme, comment_background_url')
        .in('id', fallbackUserIds);
      
      if (fallbackProfilesError) {
        console.warn('Error fetching profiles (fallback):', fallbackProfilesError);
      }

      // Fetch likes data similarly for fallback
      let fallbackLikesData: any[] = [];
      let fallbackUserLikesSet = new Set<string>();
      const fallbackCommentIds = fallbackData.map(c => c.id); // Use fallbackData

      if (fallbackCommentIds.length > 0) {
        // Fetch like counts
        const { data: likeCounts, error: countError } = await supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', fallbackCommentIds);
        
        if (countError) {
          console.warn('Error fetching fallback like counts:', countError);
        } else if (likeCounts) {
          const counts: Record<string, number> = {};
          likeCounts.forEach(like => {
            counts[like.comment_id] = (counts[like.comment_id] || 0) + 1;
          });
          fallbackLikesData = Object.entries(counts).map(([comment_id, count]) => ({ comment_id, like_count: count }));
        }

        // Fetch user likes
        if (formattedUserId) {
          const { data: userLikes, error: userLikesError } = await supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', formattedUserId)
            .in('comment_id', fallbackCommentIds);

          if (userLikesError) {
            console.warn('Error fetching fallback user likes:', userLikesError);
          } else if (userLikes) {
            userLikes.forEach(like => fallbackUserLikesSet.add(like.comment_id));
          }
        }
      }
      
      const commentsWithProfiles = fallbackData.map(comment => { // Use fallbackData
        const profile = fallbackProfiles?.find(p => p.id === comment.user_id); // Use fallbackProfiles
        const likeInfo = fallbackLikesData.find(l => l.comment_id === comment.id);
        
        return {
          ...comment,
          user_profile: profile ? {
            username: profile.username || 'User',
            avatar_url: profile.avatar_url || null,
            vip_status: profile.vip_status || false,
            vip_theme: profile.vip_theme || null,
            comment_background_url: profile.comment_background_url || null
          } : {
            username: 'User',
            avatar_url: null
          },
          replies: [], // No replies in fallback mode
          like_count: likeInfo?.like_count || 0,
          user_has_liked: formattedUserId ? fallbackUserLikesSet.has(comment.id) : false
        } as Comment;
      });
      
      return { success: true, comments: commentsWithProfiles };
    }
    
    return { success: true, comments: fallbackData as Comment[] }; // Return fallbackData if empty
  } catch (error) {
    console.error('Error fetching comments:', error);
    return { success: false, error, comments: [] };
  }
}

// Upload a media file for a comment
export async function uploadCommentMedia(file: File): Promise<{ success: boolean; url?: string; error?: any }> {
  try {
    // Generate a unique filename with original extension
    const fileExt = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `comment-media/${fileName}`
    
    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      throw error
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)
    
    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Error uploading comment media:', error)
    return { success: false, error }
  }
}

// Delete a comment media file
export async function deleteCommentMedia(mediaUrl: string): Promise<{ success: boolean; error?: any }> {
  try {
    // Extract the path from the media URL
    const urlObj = new URL(mediaUrl)
    const pathParts = urlObj.pathname.split('/')
    const bucketNameIndex = pathParts.findIndex(part => part === 'media')
    
    if (bucketNameIndex === -1) {
      throw new Error('Invalid media URL format')
    }
    
    // Get the file path after the bucket name
    const filePath = pathParts.slice(bucketNameIndex + 1).join('/')
    
    // Delete the file from Supabase Storage
    const { error } = await supabase.storage
      .from('media')
      .remove([filePath])
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting comment media:', error)
    return { success: false, error }
  }
}

// Conceptual: Function to toggle a like on a comment
export async function toggleCommentLike(commentId: string, userId: string, contentId: string, contentType: 'manga' | 'comics'): Promise<{ success: boolean; liked: boolean; newLikeCount: number; error?: any }> {
  if (!supabase) {
    return { success: false, liked: false, newLikeCount: 0, error: 'Supabase client not initialized' };
  }
  if (!userId || !commentId || !contentId || !contentType) {
    return { success: false, liked: false, newLikeCount: 0, error: 'User ID, Comment ID, and Content Type are required' };
  }

  const formattedUserId = ensureUUID(userId);

  try {
    // Validate content type
    if (!['manga', 'comics'].includes(contentType)) {
      console.error('Invalid contentType for toggleCommentLike:', contentType);
      return { success: false, liked: false, newLikeCount: 0, error: 'Invalid content type' };
    }

    // 1. Check if the user already liked this comment
    const { data: existingLike, error: checkError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', formattedUserId)
      .maybeSingle(); // Use maybeSingle to handle 0 or 1 result without erroring

    if (checkError) {
      console.error('Error checking for existing like:', checkError);
      throw checkError;
    }

    let liked = false;

    // 2. If like exists, delete it (unlike)
    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error deleting like:', deleteError);
        throw deleteError;
      }
      liked = false;
      console.log(`User ${formattedUserId} unliked comment ${commentId}`);
    }
    // 3. If like doesn't exist, insert it (like)
    else {
      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: formattedUserId });

      if (insertError) {
        console.error('Error inserting like:', insertError);
        // Handle potential duplicate key error if race condition occurs
        if (insertError.code === '23505') { 
          console.warn('Like already existed (race condition?), treating as success.');
           liked = true; // Assume it's now liked
        } else {
          throw insertError;
        }
      } else {
        liked = true;
        console.log(`User ${formattedUserId} liked comment ${commentId}`);
      }
    }

    // 4. Get the new like count for the comment
    const { count: newLikeCount, error: countError } = await supabase
      .from('comment_likes')
      .select('id', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    if (countError) {
      console.error('Error fetching new like count:', countError);
      // Don't fail the whole operation, but log the error
      // Return the potentially inaccurate liked status with a count of 0
      return { success: true, liked: liked, newLikeCount: 0, error: countError };
    }

    // 5. Return success with the new state
    return { success: true, liked: liked, newLikeCount: newLikeCount ?? 0 };

  } catch (error) {
    console.error('Error in toggleCommentLike:', error);
    // Determine the likely state before the error for better UI reversion
    const likelyPreviousState = await checkUserLikedComment(commentId, formattedUserId); 
    const {count: fallbackCount} = await getCommentLikeCount(commentId);
    return { success: false, liked: likelyPreviousState, newLikeCount: fallbackCount, error };
  }
}

// Conceptual Helper: Check if user liked a comment (needed for error recovery)
async function checkUserLikedComment(commentId: string, userId: string): Promise<boolean> {
   if (!supabase || !userId || !commentId) return false;
   const formattedUserId = ensureUUID(userId);
   const { data } = await supabase
     .from('comment_likes')
     .select('id')
     .eq('comment_id', commentId)
     .eq('user_id', formattedUserId)
     .limit(1);
   return !!data && data.length > 0;
}

// Conceptual Helper: Get like count (needed for error recovery)
async function getCommentLikeCount(commentId: string): Promise<{count: number}> {
   if (!supabase || !commentId) return {count: 0};
   const { count } = await supabase
     .from('comment_likes')
     .select('id', { count: 'exact', head: true })
     .eq('comment_id', commentId);
   return {count: count ?? 0};
} 