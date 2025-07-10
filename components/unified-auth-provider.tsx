"use client"

import { createContext, useContext, ReactNode, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useAuth as useSupabaseAuth } from "@/components/supabase-auth-provider"
import { getCurrentUserId, getCurrentUsername, getCurrentAvatarUrl } from "@/lib/auth-utils"

// Unified auth type that combines both auth systems
type UnifiedAuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  userId: string | null
  username: string | null
  avatarUrl: string | null
  email: string | null
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined)

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  // Get auth data from both providers
  const { data: nextAuthSession, status: nextAuthStatus } = useSession()
  const { user: supabaseUser, isLoading: supabaseLoading } = useSupabaseAuth()
  
  // Unified auth state
  const [unifiedAuth, setUnifiedAuth] = useState<UnifiedAuthContextType>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    username: null,
    avatarUrl: null,
    email: null
  })
  
  // Update the unified auth state whenever either auth system changes
  useEffect(() => {
    // Determine if we're still loading from either auth system
    const isLoading = supabaseLoading || nextAuthStatus === "loading"
    
    // Determine authentication from either system
    const isAuthenticated = nextAuthStatus === "authenticated" || !!supabaseUser
    
    // Get the user ID, username, and avatar from either system
    const userId = getCurrentUserId(nextAuthSession, supabaseUser)
    const username = getCurrentUsername(nextAuthSession, supabaseUser)
    const avatarUrl = getCurrentAvatarUrl(nextAuthSession, supabaseUser)
    
    // Get email from either system
    const email = nextAuthSession?.user?.email || supabaseUser?.email || null
    
    // Update the unified auth state
    setUnifiedAuth({
      isAuthenticated,
      isLoading,
      userId,
      username: username === 'User' && !userId ? null : username,
      avatarUrl,
      email
    })
    
    // Log the auth state for debugging
    console.log("Auth state updated:", {
      nextAuthStatus,
      supabaseUser: !!supabaseUser,
      isAuthenticated,
      userId
    })
    
  }, [nextAuthSession, nextAuthStatus, supabaseUser, supabaseLoading])
  
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