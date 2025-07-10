import { supabase } from './supabase'
import { NextAuthOptions } from "next-auth"
import { createClient } from '@/lib/supabase/server'

// Refresh auth session
export async function refreshSession() {
  try {
    console.log("Attempting to refresh auth session...");
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return { success: false, error: sessionError };
    }
    
    if (!session) {
      console.log("No session to refresh");
      return { success: false, error: { message: "No active session" } };
    }
    
    // First get the user data to ensure we have all current metadata
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Error getting user data:", userError);
      // Continue with refresh anyway
    } else {
      console.log("Current user metadata:", userData?.user?.user_metadata);
    }

    // Get the profile from Supabase to have the latest avatar_url
    const userId = userData?.user?.id || session.user.id;
    const { success: profileSuccess, profile, error: profileError } = await getUserProfile(userId);
    
    let customMetadata = {};
    if (profileSuccess && profile && profile.avatar_url) {
      console.log("Found Supabase profile with avatar:", profile.avatar_url);
      // Keep record of the profile avatar to ensure it gets priority
      customMetadata = {
        ...userData?.user?.user_metadata,
        avatar_url: profile.avatar_url,
        // Also store Discord's original avatar for reference
        discord_avatar_url: userData?.user?.user_metadata?.avatar_url
      };
    }
    
    // Attempt to refresh session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Error refreshing session:", error);
      return { success: false, error };
    }
    
    // Verify that the refreshed user data includes all expected metadata
    if (data?.user) {
      console.log("Session refreshed successfully with user:", 
        data.user.id,
        "Metadata:", data.user.user_metadata);
        
      // If we have custom metadata or profile data, ensure it's updated
      if (Object.keys(customMetadata).length > 0 || 
          (profileSuccess && profile && profile.avatar_url && 
           (!data.user.user_metadata.avatar_url || 
            data.user.user_metadata.avatar_url !== profile.avatar_url))) {
        console.log("Updating user metadata to prioritize Supabase profile avatar...");
        
        // Force update user metadata to ensure correct avatar_url
        const updateMetadata = {
          ...data.user.user_metadata,
          ...customMetadata
        };
        
        const { error: updateError } = await supabase.auth.updateUser({
          data: updateMetadata
        });
        
        if (updateError) {
          console.error("Error updating user metadata during refresh:", updateError);
        } else {
          console.log("User metadata updated during refresh to use Supabase avatar");
          
          // Update the user object with the new metadata for the return value
          data.user.user_metadata = updateMetadata;
        }
      }
    }
    
    return { 
      success: true, 
      session: data.session,
      user: data.user
    };
  } catch (error) {
    console.error("Unexpected error refreshing session:", error);
    return { 
      success: false, 
      error: { 
        message: error instanceof Error ? error.message : "Failed to refresh session",
      }
    };
  }
}

// Register a new user with email and password
export async function registerUser(email: string, password: string, username: string) {
  try {
    console.log(`Starting registration process for email: ${email}, username: ${username}`);
    
    // First check if the username is already taken
    const { data: existingUser, error: usernameCheckError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();
      
    if (usernameCheckError && !usernameCheckError.message.includes('No rows found')) {
      console.error('Error checking username:', usernameCheckError);
      return { success: false, error: usernameCheckError };
    }
      
    if (existingUser) {
      console.log('Username already taken:', username);
      return { 
        success: false, 
        error: { message: 'profiles_username_key: Username already taken' } 
      };
    }

    // Create the user in Supabase Auth
    console.log('Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error('Auth sign up error:', authError);
      return { success: false, error: authError };
    }

    if (!authData.user) {
      console.error('No user returned from auth signup');
      return { 
        success: false, 
        error: { message: 'User creation failed' } 
      };
    }

    console.log('Auth user created with ID:', authData.user.id);

    // Create user profile in profiles table
    console.log('Creating user profile...');
    const profileData = {
      id: authData.user.id,
      email,
      username,
      avatar_url: '',
    };
    console.log('Profile data to insert:', profileData);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return { success: false, error: profileError };
    }

    console.log('Registration successful for user:', authData.user.id);
    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      error: { 
        message: error instanceof Error ? error.message : 'Unknown registration error' 
      } 
    };
  }
}

// Update user profile
export async function updateProfile(userId: string, profileData: any) {
  console.log("Updating profile for user:", userId);
  try {
    const supabase = createClient();
    
    // Check if displayName is in the profile data
    const displayName = profileData.displayName || profileData.display_name;
    const hasBio = profileData.hasOwnProperty('bio');
    const hasLocation = profileData.hasOwnProperty('location');
    const hasAvatarUrl = profileData.hasOwnProperty('avatar_url');
    
    // If we have user metadata fields (displayName, bio, location, avatar_url), update them
    if (displayName || hasBio || hasLocation || hasAvatarUrl) {
      console.log("Updating user metadata");
      
      // First check if we have an active session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        console.warn("No active session found for metadata update - will skip metadata update");
        // Continue with profile table update but log warning about metadata
      } else {
        // We have an active session, proceed with metadata update
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { 
            ...(displayName && { displayName }),
            ...(hasBio && { bio: profileData.bio }),
            ...(hasLocation && { location: profileData.location }),
            ...(hasAvatarUrl && { avatar_url: profileData.avatar_url })
          }
        });
        
        if (metadataError) {
          console.error("Error updating user metadata:", metadataError);
          // Don't return early, still try to update the profile in the database
        } else {
          console.log("User metadata updated successfully");
        }
      }
    }
    
    // Add updated_at field to profileData for cache invalidation
    const profileDataWithTimestamp = {
      ...profileData,
      updated_at: new Date().toISOString()
    };
    
    // Remove metadata fields from profile data to avoid schema errors
    delete profileDataWithTimestamp.display_name;
    delete profileDataWithTimestamp.displayName;
    
    // Standard Supabase approach - this is now the only approach we use
    console.log("Using standard Supabase update for profile:", userId);
    const { data, error } = await supabase
      .from('profiles')
      .update(profileDataWithTimestamp)
      .eq('id', userId)
      .select();
    
    if (error) {
      console.error("Error updating profile:", error);
      
      // Check if the error is because the profile doesn't exist
      if (error.message && error.message.includes('does not exist')) {
        // Create a new profile record
        console.log("Profile doesn't exist, creating it");
        const newProfileData = {
          id: userId,
          username: profileData.username || `user_${userId.substring(0, 8)}`,
          updated_at: new Date().toISOString(),
          ...profileData
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfileData)
          .select();
        
        if (insertError) {
          console.error("Error creating profile:", insertError);
          return { error: insertError, data: null };
        }
        
        console.log("Profile created successfully");
        return { data: insertData && insertData.length > 0 ? insertData[0] : null, error: null };
      }
      
      return { data: null, error };
    }
    
    // Return the result
    return { data: data && data.length > 0 ? data[0] : null, error };
  } catch (e) {
    console.error("Exception in updateProfile:", e);
    return { error: e, data: null };
  }
}

// Get user profile
export async function getUserProfile(userId: string) {
  try {
    if (!userId) {
      console.error('Get profile error: No user ID provided');
      return { 
        success: false, 
        error: { message: 'No user ID provided' }
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this is a common case, not an error
          console.log(`No profile found for user ID: ${userId}`);
          return { 
            success: true, 
            profile: null 
          };
        }
        throw error;
      }

      return { success: true, profile: data };
    } catch (supabaseError) {
      // Handle Supabase-specific errors
      console.error('Supabase error in getUserProfile:', supabaseError);
      return { 
        success: false, 
        error: { 
          message: supabaseError instanceof Error ? supabaseError.message : 'Database connection error',
          code: (typeof supabaseError === 'object' && supabaseError !== null && 'code' in supabaseError) ? (supabaseError as any).code : 'UNKNOWN'
        } 
      };
    }
  } catch (error) {
    // This catches any other unexpected errors
    console.error('Unexpected error in getUserProfile:', error);
    return { 
      success: false, 
      error: { 
        message: 'An unexpected error occurred while fetching profile data',
        details: error instanceof Error ? error.message : 'Unknown error'
      } 
    };
  }
}

// Add or remove favorite
export async function toggleFavorite(userId: string, contentId: string, contentType: 'anime' | 'manga') {
  try {
    // Check if already favorited
    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)

    if (checkError) {
      throw checkError
    }

    if (existing && existing.length > 0) {
      // Remove from favorites
      const { error: removeError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing[0].id)

      if (removeError) {
        throw removeError
      }

      return { success: true, action: 'removed' }
    } else {
      // Add to favorites
      const { error: addError } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
        })

      if (addError) {
        throw addError
      }

      return { success: true, action: 'added' }
    }
  } catch (error) {
    console.error('Toggle favorite error:', error)
    return { success: false, error }
  }
}

// Update watchlist item status
export async function updateWatchlistStatus(
  userId: string, 
  contentId: string, 
  contentType: 'anime' | 'manga', 
  status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped' | 'reading' | 'plan_to_read',
  progress: number = 0,
  rating: number | null = null
) {
  try {
    // Check if already in watchlist
    const { data: existing, error: checkError } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)

    if (checkError) {
      throw checkError
    }

    if (existing && existing.length > 0) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('watchlist')
        .update({
          status,
          progress,
          rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id)

      if (updateError) {
        throw updateError
      }
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('watchlist')
        .insert({
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
          status,
          progress,
          rating
        })

      if (insertError) {
        throw insertError
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Update watchlist error:', error)
    return { success: false, error }
  }
}

// Get user's watchlist
export async function getUserWatchlist(userId: string, contentType?: 'anime' | 'manga' | 'comics', status?: string) {
  try {
    if (!userId) {
      console.error('Get watchlist error: No user ID provided');
      return { 
        success: false, 
        error: { message: 'No user ID provided' }
      };
    }

    try {
      // Log the session status to debug authentication issues
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth session when fetching watchlist:', session ? 'Valid session' : 'No session');
      
      // Modified query to avoid the foreign key relationship error
      // First fetch the watchlist items
      let query = supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', userId);
      
      if (contentType) {
        query = query.eq('content_type', contentType);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data: watchlistData, error } = await query;

      if (error) {
        console.error('Supabase error details:', JSON.stringify(error));
        
        // Check if this is a database connection error or auth error
        if (error.code === 'PGRST') {
          throw new Error('Database connection error');
        } else if (error.code === '42501' || error.message.includes('permission denied')) {
          throw new Error('Permission denied. Authentication may have expired.');
        }
        
        throw error;
      }

      // If no watchlist data, return empty array
      if (!watchlistData || watchlistData.length === 0) {
        return { success: true, watchlist: [] };
      }

      // Separately fetch the content information
      const contentIds = watchlistData.map(item => item.content_id);
      
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .in('id', contentIds);
      
      if (contentError) {
        console.error('Error fetching content data:', contentError);
        // Continue anyway, we'll just return watchlist without content details
      }
      
      // Merge the watchlist and content data
      const mergedData = watchlistData.map(watchlistItem => {
        const content = contentData?.find(c => c.id === watchlistItem.content_id) || null;
        return {
          ...watchlistItem,
          content
        };
      });

      return { 
        success: true, 
        watchlist: mergedData
      };
    } catch (supabaseError: any) {
      // Handle Supabase-specific errors
      console.error('Supabase error in getUserWatchlist:', supabaseError);
      
      return { 
        success: false, 
        error: { 
          message: supabaseError.message || 'Database connection error',
          code: (typeof supabaseError === 'object' && supabaseError !== null && 'code' in supabaseError) ? (supabaseError as any).code : 'UNKNOWN',
          details: supabaseError.details || 'Check your internet connection and try refreshing the page.'
        } 
      };
    }
  } catch (error: any) {
    // This catches any other unexpected errors
    console.error('Unexpected error in getUserWatchlist:', error);
    return { 
      success: false, 
      error: { 
        message: 'An unexpected error occurred while fetching watchlist data',
        details: error.message || 'Unknown error'
      } 
    };
  }
}

// Get user's favorites
export async function getUserFavorites(userId: string, contentType?: 'anime' | 'manga') {
  try {
    // First get the favorites
    let query = supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
    
    if (contentType) {
      query = query.eq('content_type', contentType)
    }
    
    const { data: favoritesData, error } = await query

    if (error) {
      console.error('Error fetching favorites:', error);
      throw error
    }

    // If no favorites, return empty array
    if (!favoritesData || favoritesData.length === 0) {
      return { success: true, favorites: [] };
    }

    // Then get the content details separately
    const contentIds = favoritesData.map(item => item.content_id);
    
    const { data: contentData, error: contentError } = await supabase
      .from('content')
      .select('*')
      .in('id', contentIds);
    
    if (contentError) {
      console.error('Error fetching content data for favorites:', contentError);
      // Continue anyway, we'll just return favorites without content details
    }
    
    // Merge the favorites and content data
    const mergedData = favoritesData.map(favoriteItem => {
      const content = contentData?.find(c => c.id === favoriteItem.content_id) || null;
      return {
        ...favoriteItem,
        content
      };
    });

    return { success: true, favorites: mergedData }
  } catch (error) {
    console.error('Get favorites error:', error)
    return { success: false, error }
  }
}

// This is a minimal auth setup to make the comments feature work
// In a real app, you would connect this to your actual authentication system
export const authOptions: NextAuthOptions = {
  providers: [
    // CredentialsProvider removed - Use Supabase Auth for email/password
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        // Make sure we always have an ID in the session
        session.user.id = token.sub as string
        
        // Add empty defaults for user_metadata (to match Supabase structure)
        if (!session.user.name) {
          session.user.name = "User"
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    }
  }
}

// Re-fetch and sync user data after login
export async function syncUserAfterLogin(userId: string) {
  try {
    console.log("Syncing user data after login for:", userId);
    
    // Get user profile from database
    const { success, profile } = await getUserProfile(userId);
    
    if (!success || !profile) {
      console.log("No profile found or error fetching profile during sync");
      return { success: false };
    }
    
    console.log("Found profile, updating session metadata with profile data");
    
    // Update user metadata with profile data
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user) {
      console.log("No authenticated user found during sync");
      return { success: false };
    }
    
    // Create updated metadata that preserves auth provider data but prioritizes our profile
    const updatedMetadata = {
      ...userData.user.user_metadata,
      // Store original OAuth avatar for reference
      oauth_avatar_url: userData.user.user_metadata?.avatar_url,
      // Override with our profile avatar if available
      ...(profile.avatar_url && { avatar_url: profile.avatar_url })
    };
    
    // Update user metadata
    const { error } = await supabase.auth.updateUser({
      data: updatedMetadata
    });
    
    if (error) {
      console.error("Error updating user metadata during sync:", error);
      return { success: false, error };
    }
    
    console.log("Successfully synced user data after login");
    return { success: true };
  } catch (error) {
    console.error("Error syncing user after login:", error);
    return { success: false, error };
  }
}

export interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  website?: string | null;
  created_at?: string; 
  vip_status?: boolean; 
  vip_theme?: string; 
  banner_url?: string;
  comment_background_url?: string | null;
  is_public?: boolean;
  birth_date?: string | null;
  location?: string | null;
  // Add any other fields you expect from your profiles table
} 