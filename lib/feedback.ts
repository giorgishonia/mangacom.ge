import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { createClient as createClientBrowser } from '@/utils/supabase/client';
import { getCurrentSession } from '@/lib/session';
import { getProfile } from './user';
import { getSupabaseAvatarUrl } from '@/lib/comments';
import { 
  Tables, 
  TablesInsert,
  TablesUpdate,
} from '@/types/supabase';
import { toast } from 'sonner';

// UUID namespace for consistency
const UUID_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

// Helper to ensure UUID format
const ensureUUID = (id: string): string => {
  try {
    // Check if valid UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    // Generate deterministic UUID from string
    return uuidv5(id, UUID_NAMESPACE);
  } catch (error) {
    // Fallback to random UUID
    console.error('Error ensuring UUID format:', error);
    return uuidv4();
  }
};

// Types and interfaces
export type SuggestionType = 'ანიმე' | 'მანგა' | 'სტიკერი' | 'გიფი';

export interface UserProfile {
  id: string;
  name?: string;
  username?: string;
  image?: string;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: SuggestionType;
  image_url?: string;
  created_at: string;
  vote_count: number;
  has_voted: boolean;
  user: UserProfile;
}

export interface SuggestionComment {
  id: string;
  content: string;
  created_at: string;
  user: UserProfile;
}

export interface NewSuggestion {
  title: string;
  description: string;
  type: SuggestionType;
  userId: string;
}

export interface NewComment {
  suggestionId: string;
  userId: string;
  content: string;
}

// Get all suggestions
export async function getAllSuggestions(userId?: string): Promise<Suggestion[]> {
  const supabase = createClient();

  try {
    // First get all suggestions without joining user data
    const { data: suggestions, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suggestions:', error);
      throw new Error(error.message);
    }

    if (!suggestions?.length) {
      return [];
    }

    // Get user profiles separately if needed
    const userIds = [...new Set(suggestions.map(s => s.user_id))];
    let userProfiles: Record<string, UserProfile> = {};
    
    if (userIds.length > 0) {
      // First try to get all profiles at once for better performance
      const { data: allProfiles, error: batchError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      
      if (!batchError && allProfiles) {
        // Create a lookup map of profiles by ID
        userProfiles = allProfiles.reduce((acc, profile) => {
          acc[profile.id] = {
            id: profile.id,
            name: profile.username, // use username as display name
            username: profile.username,
            image: getSupabaseAvatarUrl(profile.id, profile.avatar_url)
          };
          return acc;
        }, {} as Record<string, UserProfile>);
      } else {
        // Fallback to individual queries if the batch query fails
        console.warn('Batch profile query failed, falling back to individual queries');
        const profilePromises = userIds.map(async (id) => {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', id)
            .single();
            
          if (!error && data) {
            return data ? {
              id: data.id,
              name: data.username,
              username: data.username,
              image: getSupabaseAvatarUrl(data.id, data.avatar_url)
            } : null;
          }
          return null;
        });
        
        const profiles = (await Promise.all(profilePromises)).filter(Boolean);
        
        userProfiles = profiles.reduce((acc, profile) => {
          if (profile) {
            acc[profile.id] = profile;
          }
          return acc;
        }, {} as Record<string, UserProfile>);
      }
    }

    // If userId is provided, check which suggestions the user has voted on
    let votedSuggestionIds: string[] = [];
    if (userId) {
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('suggestion_id')
        .eq('user_id', userId);

      if (votesError) {
        console.error('Error fetching voted suggestions:', votesError);
      } else {
        votedSuggestionIds = votes?.map(vote => vote.suggestion_id) || [];
      }
    }

    // Format the suggestions with vote information
    return suggestions.map(suggestion => ({
      id: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      type: suggestion.type,
      image_url: suggestion.image_url,
      created_at: suggestion.created_at,
      vote_count: suggestion.vote_count || 0,
      has_voted: votedSuggestionIds.includes(suggestion.id),
      user: userProfiles[suggestion.user_id] || {
        id: suggestion.user_id,
        name: 'უცნობი მომხმარებელი',
        username: 'უცნობი მომხმარებელი',
        image: getSupabaseAvatarUrl(suggestion.user_id, null) || undefined
      }
    }));
  } catch (error) {
    console.error('Error in getAllSuggestions:', error);
    throw error;
  }
}

// Get suggestion by ID
export async function getSuggestionById(id: string, userId?: string): Promise<Suggestion | null> {
  const supabase = createClient();
  
  try {
    // Get suggestion without joining user
    const { data: suggestion, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching suggestion:', error);
      throw new Error(error.message);
    }

    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    // Get user profile for the suggestion author
    let userProfile: UserProfile | null = null;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', suggestion.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    } else {
      userProfile = {
        id: profile.id,
        name: profile.username,
        username: profile.username,
        image: getSupabaseAvatarUrl(profile.id, profile.avatar_url)
      };
    }

    // Check if the user has voted on this suggestion
    let hasVoted = false;
    if (userId) {
      const { data: vote, error: voteError } = await supabase
        .from('votes')
        .select('id')
        .eq('suggestion_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (voteError) {
        console.error('Error checking vote status:', voteError);
      } else {
        hasVoted = !!vote;
      }
    }

    // Format the suggestion with vote information
    return {
      id: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      type: suggestion.type,
      image_url: suggestion.image_url,
      created_at: suggestion.created_at,
      vote_count: suggestion.vote_count || 0,
      has_voted: hasVoted,
      user: userProfile || {
        id: suggestion.user_id,
        name: 'უცნობი მომხმარებელი',
        username: 'უცნობი მომხმარებელი',
        image: getSupabaseAvatarUrl(suggestion.user_id, null) || undefined
      }
    };
  } catch (error) {
    console.error('Error in getSuggestionById:', error);
    return null;
  }
}

// Add suggestion with graceful fallback to demo mode
export async function addSuggestion(newSuggestion: NewSuggestion): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = createClient();
  const suggestionId = uuidv4();

  try {
    // Check if tables exist
    const { error: tableCheckError } = await supabase
      .from('suggestions')
      .select('id')
      .limit(1);
    
    // If tables don't exist (demo mode)
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.log('Tables do not exist - using demo mode');
      
      // Return success in demo mode
      return { 
        success: true, 
        id: suggestionId,
        error: 'Demo mode: Suggestion would be created in production'
      };
    }

    const { error } = await supabase
      .from('suggestions')
      .insert({
        id: suggestionId,
        title: newSuggestion.title,
        description: newSuggestion.description,
        type: newSuggestion.type,
        user_id: newSuggestion.userId,
        vote_count: 0
      });

    if (error) {
      console.error('Error adding suggestion:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: suggestionId };
  } catch (error) {
    console.error('Error in addSuggestion:', error);
    return { success: true, id: suggestionId, error: 'Demo mode active' };
  }
}

// Toggle vote on a suggestion
export async function toggleVote(suggestionId: string, userId: string): Promise<{ success: boolean; error?: string; added?: boolean }> {
  const supabase = createClient();

  try {
    // Check if vote already exists
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('id')
      .eq('suggestion_id', suggestionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking vote:', checkError);
      return { success: false, error: checkError.message };
    }

    // First, get the current vote count
    const { data: suggestion, error: suggestionError } = await supabase
      .from('suggestions')
      .select('vote_count')
      .eq('id', suggestionId)
      .single();
      
    if (suggestionError) {
      console.error('Error getting suggestion:', suggestionError);
      return { success: false, error: suggestionError.message };
    }
    
    const currentCount = suggestion?.vote_count || 0;

    if (existingVote) {
      // Remove vote
      const { error: deleteError } = await supabase
        .from('votes')
        .delete()
        .eq('id', existingVote.id);

      if (deleteError) {
        console.error('Error removing vote:', deleteError);
        return { success: false, error: deleteError.message };
      }

      // Decrement vote count directly
      const { error: updateError } = await supabase
        .from('suggestions')
        .update({ vote_count: Math.max(0, currentCount - 1) })
        .eq('id', suggestionId);

      if (updateError) {
        console.error('Error decrementing vote count:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, added: false };
    } else {
      // Add vote
      const { error: insertError } = await supabase
        .from('votes')
        .insert({
          id: uuidv4(),
          suggestion_id: suggestionId,
          user_id: userId
        });

      if (insertError) {
        console.error('Error adding vote:', insertError);
        return { success: false, error: insertError.message };
      }

      // Increment vote count directly
      const { error: updateError } = await supabase
        .from('suggestions')
        .update({ vote_count: currentCount + 1 })
        .eq('id', suggestionId);

      if (updateError) {
        console.error('Error incrementing vote count:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, added: true };
    }
  } catch (error) {
    console.error('Error in toggleVote:', error);
    return { success: false, error: 'Failed to process vote' };
  }
}

// Get comments for a suggestion
export async function getCommentsBySuggestionId(suggestionId: string): Promise<SuggestionComment[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('suggestion_id', suggestionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      throw new Error(error.message);
    }

    return data.map(comment => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      user: comment.user ? {
        id: comment.user.id,
        name: comment.user.username,
        username: comment.user.username,
        image: getSupabaseAvatarUrl(comment.user.id, comment.user.avatar_url)
      } : {
        id: comment.user_id,
        name: 'უცნობი მომხმარებელი',
        username: 'უცნობი მომხმარებელი',
        image: getSupabaseAvatarUrl(comment.user_id, null) || undefined
      }
    }));
  } catch (error) {
    console.error('Error in getCommentsBySuggestionId:', error);
    throw error;
  }
}

// Add a comment to a suggestion
export async function addComment(newComment: NewComment): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('comments')
      .insert({
        id: uuidv4(),
        suggestion_id: newComment.suggestionId,
        user_id: newComment.userId,
        content: newComment.content
      });

    if (error) {
      console.error('Error adding comment:', error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addComment:', error);
    throw error;
  }
}

/**
 * Delete a suggestion (admin or owner only)
 */
export async function deleteSuggestion(id: string, userId: string): Promise<{ success: boolean; error?: any }> {
  const supabase = createClient();
  
  // First check if user is authorized (owner or admin)
  const { data: suggestion } = await supabase
    .from('suggestions')
    .select('user_id')
    .eq('id', id)
    .single();
  
  if (!suggestion) {
    return { success: false, error: 'Suggestion not found' };
  }
  
  // TODO: Add admin check here
  if (suggestion.user_id !== userId) {
    return { success: false, error: 'Not authorized' };
  }
  
  // Delete all votes for this suggestion
  const { error: votesError } = await supabase
    .from('votes')
    .delete()
    .eq('suggestion_id', id);

  if (votesError) {
    console.error('Error deleting votes:', votesError);
    // Continue with deletion even if votes deletion fails
  }

  // Delete all comments for this suggestion
  const { error: commentsError } = await supabase
    .from('comments')
    .delete()
    .eq('suggestion_id', id);

  if (commentsError) {
    console.error('Error deleting comments:', commentsError);
    // Continue with deletion even if comments deletion fails
  }

  // Delete the suggestion
  const { error } = await supabase
    .from('suggestions')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting suggestion:', error);
    return { success: false, error };
  }
  
  return { success: true };
}

export async function deleteComment(commentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // First check if the user is the owner of the comment
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('Error fetching comment:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (comment.user_id !== userId) {
      return { success: false, error: 'You can only delete your own comments' };
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteComment:', error);
    return { success: false, error: 'Failed to delete comment' };
  }
} 