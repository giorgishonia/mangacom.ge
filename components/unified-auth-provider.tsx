"use client"

import { createContext, useContext, ReactNode, useEffect, useState } from "react"
import { useAuth as useSupabaseAuth } from "@/components/supabase-auth-provider"

// Unified auth type (now just using Supabase)
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
  // Get auth data from Supabase provider
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
      email
    })
    
    // Log the auth state for debugging
    console.log("Auth state updated:", {
      supabaseUser: !!supabaseUser,
      isAuthenticated,
      userId
    })
    
  }, [supabaseUser, supabaseLoading])
  
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