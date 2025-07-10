import { supabase } from "./supabase";

/**
 * Sign out from Supabase authentication
 * @returns Promise that resolves when sign-out is complete
 */
export async function signOut() {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear any stored tokens/cookies that might persist
    clearAuthTokens();
    
    return { success: true };
  } catch (error) {
    console.error("Error during sign out:", error);
    return { success: false, error };
  }
}

/**
 * Helper function to clear any auth-related tokens, cookies or local storage items
 */
function clearAuthTokens() {
  try {
    // Clear localStorage items related to auth
    const authKeys = [
      'supabase.auth.token',
      'localComments',
      // Add any other auth-related keys used in your app
    ];
    
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore errors for individual items
      }
    });
  } catch (e) {
    console.error("Error clearing auth tokens:", e);
  }
}

/**
 * Gets the current user ID from Supabase Auth
 * @param supabaseUser - Supabase User object
 * @returns The user ID or null if not authenticated
 */
export function getCurrentUserId(supabaseUser: any): string | null {
  // Get user ID from Supabase
  if (supabaseUser?.id) {
    return supabaseUser.id;
  }
  
  return null;
}

/**
 * Gets the current username from Supabase Auth
 * @param supabaseUser - Supabase User object
 * @returns The username or 'User' if not found
 */
export function getCurrentUsername(supabaseUser: any): string {
  // Try Supabase user metadata first
  if (supabaseUser?.user_metadata?.name) {
    return supabaseUser.user_metadata.name;
  }
  
  // Fall back to email username
  if (supabaseUser?.email) {
    return supabaseUser.email.split('@')[0];
  }
  
  return 'User';
}

/**
 * Gets the current user avatar URL from Supabase Auth
 * @param supabaseUser - Supabase User object
 * @returns The avatar URL or null if not found
 */
export function getCurrentAvatarUrl(supabaseUser: any): string | null {
  // Check profile via user metadata
  if (supabaseUser?.user_metadata?.avatar_url) {
    return supabaseUser.user_metadata.avatar_url;
  }
  
  // Use DiceBear as a fallback avatar service if we have a user ID
  if (supabaseUser?.id) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`;
  }
  
  return null;
} 