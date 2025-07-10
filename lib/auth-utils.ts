import { signOut as nextAuthSignOut, useSession } from "next-auth/react";
import { supabase } from "./supabase";

/**
 * Sign out from all authentication providers
 * @returns Promise that resolves when all sign-out operations are complete
 */
export async function signOutFromAllProviders() {
  try {
    // Create an array of promises for each sign-out operation
    const signOutPromises = [
      // Sign out from Supabase
      supabase.auth.signOut(),
      
      // Sign out from NextAuth
      nextAuthSignOut({ redirect: false })
    ];
    
    // Wait for all sign-out operations to complete
    await Promise.all(signOutPromises);
    
    // Clear any stored tokens/cookies that might persist
    clearAuthTokens();
    
    return { success: true };
  } catch (error) {
    console.error("Error during comprehensive sign out:", error);
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
      'nextauth.message',
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
    
    // Clear all session cookies - this is a more aggressive approach
    // It will clear ALL cookies, so only use if necessary
    // document.cookie.split(";").forEach(cookie => {
    //   document.cookie = cookie
    //     .replace(/^ +/, "")
    //     .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    // });
  } catch (e) {
    console.error("Error clearing auth tokens:", e);
  }
}

/**
 * Gets the current user ID from either NextAuth or Supabase Auth
 * @param nextAuthSession - NextAuth session object
 * @param supabaseUser - Supabase User object
 * @returns The user ID or null if not authenticated
 */
export function getCurrentUserId(nextAuthSession: any, supabaseUser: any): string | null {
  // Try to get user ID from NextAuth first
  if (nextAuthSession?.user?.id) {
    return nextAuthSession.user.id;
  }
  
  // If not available, try Supabase
  if (supabaseUser?.id) {
    return supabaseUser.id;
  }
  
  return null;
}

/**
 * Gets the current username from either NextAuth or Supabase Auth
 * @param nextAuthSession - NextAuth session object
 * @param supabaseUser - Supabase User object
 * @returns The username or 'User' if not found
 */
export function getCurrentUsername(nextAuthSession: any, supabaseUser: any): string {
  // Try NextAuth first
  if (nextAuthSession?.user?.name) {
    return nextAuthSession.user.name;
  }
  
  // Then try Supabase
  if (supabaseUser?.user_metadata?.name) {
    return supabaseUser.user_metadata.name;
  }
  
  if (supabaseUser?.email) {
    return supabaseUser.email.split('@')[0];
  }
  
  return 'User';
}

/**
 * Gets the current user avatar URL from either NextAuth or Supabase Auth
 * @param nextAuthSession - NextAuth session object 
 * @param supabaseUser - Supabase User object
 * @returns The avatar URL or null if not found
 */
export function getCurrentAvatarUrl(nextAuthSession: any, supabaseUser: any): string | null {
  // Prioritize Supabase avatars first - check profile via user metadata
  if (supabaseUser?.user_metadata?.avatar_url) {
    return supabaseUser.user_metadata.avatar_url;
  }
  
  // For users authenticated via Supabase but without avatar in metadata,
  // don't attempt to construct a storage URL that might cause 400 errors
  
  // Only use NextAuth image as a last resort
  if (nextAuthSession?.user?.image) {
    return nextAuthSession.user.image;
  }
  
  // Use DiceBear as a fallback avatar service if we have a user ID
  if (supabaseUser?.id) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`;
  }
  
  if (nextAuthSession?.user?.id) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${nextAuthSession.user.id}`;
  }
  
  return null;
} 