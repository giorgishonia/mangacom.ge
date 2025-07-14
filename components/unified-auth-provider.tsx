"use client"

import { createContext, useContext, ReactNode, useEffect, useState } from "react"
import { useAuth as useSupabaseAuth } from "@/components/supabase-auth-provider"
import { createClient } from "@/utils/supabase/client";

// Unified auth type (now just using Supabase)
type UnifiedAuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  userId: string | null
  username: string | null
  avatarUrl: string | null
  email: string | null
  profile: any; // Add profile
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined)

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  // Get auth data from Supabase provider
  const { user: supabaseUser, isLoading: supabaseLoading } = useSupabaseAuth()
  
  // Unified auth state
  const [unifiedAuth, setUnifiedAuth] = useState<UnifiedAuthContextType>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    username: null,
    avatarUrl: null,
    email: null,
    profile: null,
  })
  
  // Update the unified auth state whenever Supabase auth changes
  useEffect(() => {
    // Determine if we're still loading
    const isLoading = supabaseLoading
    
    // Determine authentication from Supabase
    const isAuthenticated = !!supabaseUser
    
    // Get user details from Supabase user
    const userId = supabaseUser?.id || null
    const username = supabaseUser?.user_metadata?.name || 
                   supabaseUser?.email?.split('@')[0] || null
    const avatarUrl = supabaseUser?.user_metadata?.avatar_url || null
    
    // Get email from Supabase
    const email = supabaseUser?.email || null
    
    // Update the unified auth state
    setUnifiedAuth({
      isAuthenticated,
      isLoading,
      userId,
      username: username === 'User' && !userId ? null : username,
      avatarUrl,
      email,
      profile: null, // Clear profile when auth state changes
    })
    
    // Debug log removed to keep console clean
    
  }, [supabaseUser, supabaseLoading])

  useEffect(() => {
    const fetchProfile = async () => {
      if (unifiedAuth.userId) {
        const supabase = createClient();
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', unifiedAuth.userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        setUnifiedAuth(prev => ({
          ...prev,
          avatarUrl: profileData?.avatar_url || null,
          profile: profileData,
        }));
      }
    };

    fetchProfile();
  }, [unifiedAuth.userId]);
  
  return (
    <UnifiedAuthContext.Provider value={unifiedAuth}>
      {children}
    </UnifiedAuthContext.Provider>
  )
}

// Hook to use the unified auth context
export function useUnifiedAuth() {
  const context = useContext(UnifiedAuthContext)
  if (context === undefined) {
    throw new Error("useUnifiedAuth must be used within a UnifiedAuthProvider")
  }
  return context
} 