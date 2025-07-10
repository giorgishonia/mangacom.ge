import { supabase } from './supabase';

// Type for profile data, ensure it matches your schema
export interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  website: string | null;
  created_at?: string; 
  vip_status?: boolean;
  vip_theme?: string;
  banner_url?: string;
  comment_background_url?: string | null; // Added for comment backgrounds
  is_public?: boolean;
  birth_date?: string | null; // Added from profile page
  location?: string | null;   // Added from profile page
  has_completed_onboarding?: boolean;
  // Notification preferences
  email_notifications?: boolean;
  push_notifications?: boolean;
}

// --- User Profile Functions --- 

/**
 * Fetches a user profile by their username.
 * @param username - The username to search for.
 * @returns The user profile object or null if not found.
 */
export async function getUserProfileByUsername(username: string): Promise<UserProfile | null> {
  console.log(`Fetching profile for username: ${username}`);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*') // Select all columns or specify needed ones
      .eq('username', username)
      .maybeSingle(); // Use maybeSingle to return null instead of error for no rows

    if (error) {
      console.error('Error fetching profile by username:', error);
      return null;
    }
    return data as UserProfile | null;
  } catch (err) {
    console.error("Unexpected error fetching profile by username:", err);
    return null;
  }
}

/**
 * Fetches the profile for the currently authenticated user.
 * @param userId - The authenticated user's ID.
 * @returns The user profile object or null if not found/error.
 */
export async function getProfileForUser(userId: string): Promise<UserProfile | null> {
  console.log(`Fetching profile for user ID: ${userId}`);
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*') // Select necessary fields
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single()

    if (error) {
      // Don't throw error for no rows, just log other errors
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data as UserProfile | null;
  } catch (err) {
    console.error("Unexpected error fetching user profile:", err);
    return null;
  }
}

/**
 * Updates a user's profile data.
 * Ensure RLS policy allows users to update their own profile.
 * @param userId - The ID of the user to update.
 * @param profileData - An object containing the fields to update.
 * @returns Object indicating success or failure.
 */
export async function updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<{ success: boolean; error?: any }> {
  console.log(`Updating profile for user ID: ${userId}`, profileData);
  if (!userId) return { success: false, error: { message: 'User ID required' } };

  try {
    // Add updated_at timestamp
    const dataToUpdate = {
      ...profileData,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(dataToUpdate)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      // Handle specific errors like unique username violation
      if (error.code === '23505' && error.message.includes('profiles_username_key')) {
        return { success: false, error: { message: 'Username already taken.' } };
      }
      return { success: false, error };
    }

    console.log("Profile updated successfully for user:", userId);
    return { success: true };
  } catch (err) {
    console.error("Unexpected error updating profile:", err);
    return { success: false, error: err };
  }
}


// --- Onboarding Specific Functions --- 

/**
 * Checks if a username is available.
 * @param username - The username to check.
 * @returns True if available, false otherwise.
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  console.log(`Checking username availability: ${username}`);
  if (!username || username.length < 3) return false; // Basic check

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error checking username availability:', error);
      return false; // Treat error as unavailable for safety
    }

    return !data; // Returns true if data is null (username not found)
  } catch (err) {
    console.error("Unexpected error checking username:", err);
    return false;
  }
}

/**
 * Updates the user's profile with onboarding data and marks onboarding as complete.
 * @param userId - The ID of the user completing onboarding.
 * @param data - The collected onboarding data (matching UserProfile subset).
 * @returns Object indicating success or failure.
 */
export async function completeOnboarding(userId: string, data: Partial<UserProfile>): Promise<{ success: boolean, error?: any }> {
  console.log(`Completing onboarding for ${userId}:`, data);
  if (!userId) return { success: false, error: { message: 'User ID required' } };

  const dataToUpdate = {
    ...data,
    has_completed_onboarding: true, // Mark as completed
    updated_at: new Date().toISOString(),
  };

  // Remove id and created_at if they accidentally got included
  delete (dataToUpdate as any).id;
  delete (dataToUpdate as any).created_at;

  try {
    const { error } = await supabase
      .from('profiles')
      .update(dataToUpdate)
      .eq('id', userId);

    if (error) {
      console.error('Error completing onboarding (update profile):', error);
       // Handle specific errors like unique username violation again
      if (error.code === '23505' && error.message.includes('profiles_username_key')) {
        return { success: false, error: { message: 'Username already taken.' } };
      }
      return { success: false, error };
    }

    console.log("Onboarding completed successfully for user:", userId);
    return { success: true };
  } catch (err) {
    console.error("Unexpected error completing onboarding:", err);
    return { success: false, error: err };
  }
} 