"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { syncUserAfterLogin } from "@/lib/auth"
import { getProfileForUser, UserProfile } from "@/lib/users"

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  isProfileLoading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: any; success: boolean }>
  signUp: (email: string, password: string, username: string) => Promise<{ error: any; success: boolean }>
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Function to sync profile data after auth state changes
  const syncUserProfile = async (currentUser: User | null) => {
    if (currentUser && typeof currentUser.id === 'string') {
      setIsProfileLoading(true)
      let effectiveUserProfile: UserProfile | null = null
      try {
        const fetchedProfile = await getProfileForUser(currentUser.id)

        if (fetchedProfile) {
          effectiveUserProfile = fetchedProfile
        } else {
          // No profile found, attempt to create a fallback so pages relying on profile do not break
          console.warn(`No profile found for user ${currentUser.id} during sync. Attempting to create one.`)
          try {
            const profileDataToCreate = {
              id: currentUser.id,
              email: currentUser.email || '',
              username: currentUser.email?.split('@')[0] || `user_${currentUser.id.substring(0, 8)}`,
              avatar_url: currentUser.user_metadata?.avatar_url || '',
              has_completed_onboarding: false,
            }

            const { data: newProfileData, error: insertError } = await supabase
              .from('profiles')
              .insert(profileDataToCreate)
              .select()
              .single()

            if (insertError) {
              console.error('Error creating fallback profile during sync:', insertError)
            } else {
              console.log('Fallback profile created successfully:', newProfileData)
              effectiveUserProfile = newProfileData as UserProfile
            }
          } catch (creationError) {
            console.error('Unexpected error during fallback profile creation:', creationError)
          }
        }
        
        setProfile(effectiveUserProfile)
        setIsAdmin(effectiveUserProfile ? (effectiveUserProfile as UserProfile & { role?: string })?.role === 'admin' : false)
        
        if (effectiveUserProfile) {
          console.log("Profile fetched/updated in AuthProvider:", effectiveUserProfile)
        } else {
          console.log("Profile remains null after fetch/creation attempt for user:", currentUser.id)
        }

      } catch (error) {
        console.error("Error in syncUserProfile try block:", error)
        setProfile(null)
        setIsAdmin(false)
      } finally {
        setIsProfileLoading(false)
      }
    } else {
      setProfile(null)
      setIsAdmin(false)
      setIsProfileLoading(false)
      if (!currentUser) console.log("syncUserProfile: No current user to sync profile for.")
      if (currentUser && typeof currentUser.id !== 'string') console.warn("syncUserProfile: currentUser.id is not a string.")
    }
  }

  // Function to refresh user profile data manually
  const refreshUserProfile = async () => {
    if (user && typeof user.id === 'string') {
      console.log("Manually refreshing user profile...")
      await syncUserProfile(user)
      console.log("User profile refresh attempt complete.")
    } else {
      console.log("No user to refresh profile for or user.id is invalid.")
    }
  }

  // Initialize the auth state and listen for changes
  useEffect(() => {
    console.log("=== Initializing AuthProvider and setting up auth state listeners ===")
    let isMounted = true;
    
    ;(async () => {
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession()

        if (isMounted) {
          setSession(activeSession)
          const currentUser = activeSession?.user || null
          setUser(currentUser)

          console.log(
            "Initial session check:",
            currentUser ? `User ${currentUser.id} is logged in` : "No active session",
          )

          if (currentUser && typeof currentUser.id === 'string') {
            await syncUserProfile(currentUser)
          }
        }
      } catch (err) {
        console.error('Error fetching initial session from Supabase:', err)
        // In case of error (e.g., missing env vars or network failure) we still want the UI to render
      } finally {
        if (isMounted) {
          setIsLoading(false)
          console.log('Initial auth state loading completed (with or without session)')
        }
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
         console.log(`Auth state changed: ${_event}`, newSession ? `User: ${newSession.user.id}` : "No session")
         if (!isMounted) return;
         
         setSession(newSession)
         const currentUser = newSession?.user || null
         setUser(currentUser)
         
         try {
           if (currentUser && typeof currentUser.id === 'string') {
             await syncUserProfile(currentUser)
             
             if (_event !== 'SIGNED_OUT') {
               const userProfileForRedirect = await getProfileForUser(currentUser.id)
               console.log(`Auth state change (${_event}): onboarding status:`, userProfileForRedirect?.has_completed_onboarding)
               console.log(`Current path: ${pathname}`)
               
               if (userProfileForRedirect && userProfileForRedirect.has_completed_onboarding === false && 
                   pathname && !['/login', '/signup', '/onboarding', '/api/auth/callback', '/auth/callback'].includes(pathname)) {
                 console.log(`Redirecting user on auth change to /onboarding: ${currentUser.id}`)
                 
                 const lastRedirectTime = sessionStorage.getItem('lastRedirectTime')
                 const currentTime = Date.now()
                 const isRecentRedirect = lastRedirectTime && (currentTime - parseInt(lastRedirectTime)) < 3000
                 
                 if (!isRecentRedirect) {
                   console.log("No recent redirection, redirecting to onboarding now")
                   sessionStorage.setItem('lastRedirectTime', currentTime.toString())
                   router.push('/onboarding')
                 } else {
                   console.log("Skipping redirection due to recent redirect")
                 }
               }
             }
           }
         } catch (err) {
           console.error('Error during auth state change handling:', err);
         } finally {
           if (isMounted && isLoading) setIsLoading(false)
         }
      }
    )

    return () => {
      console.log("=== Cleaning up AuthProvider auth state listeners ===")
      isMounted = false;
      subscription.unsubscribe()
    }
  }, [pathname, router, isLoading])

  // Effect for handling redirection based on onboarding status
  useEffect(() => {
    if (isLoading || isProfileLoading) return

    const allowedPaths = ['/login', '/signup', '/onboarding', '/api/auth/callback', '/auth/callback']

    const needsOnboarding = user && profile && profile.has_completed_onboarding !== true
    const isNotOnAllowedPath = pathname && !allowedPaths.includes(pathname)
    
    const lastRedirectTime = sessionStorage.getItem('lastRedirectTime')
    const currentTime = Date.now()
    const isRecentRedirect = lastRedirectTime && (currentTime - parseInt(lastRedirectTime)) < 3000
    
    console.log(`Auth redirection check: needsOnboarding=${needsOnboarding}, isNotOnAllowedPath=${isNotOnAllowedPath}, pathname=${pathname}, isRecentRedirect=${isRecentRedirect}`)

    if (needsOnboarding && isNotOnAllowedPath && !isRecentRedirect && user && typeof user.id === 'string') {
      console.log(`Redirecting user ${user.id} to /onboarding because profile is not complete.`)
      sessionStorage.setItem('lastRedirectTime', currentTime.toString())
      router.push('/onboarding')
    }
  }, [user, profile, isLoading, isProfileLoading, pathname, router])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Error signing in:", error.message)
        return { error, success: false }
      }

      setUser(data.user)
      setSession(data.session)
      
      if (data.user && typeof data.user.id === 'string') {
        await syncUserProfile(data.user)
        
        const userProfileForSignIn = await getProfileForUser(data.user.id)
        
        if (userProfileForSignIn && userProfileForSignIn.has_completed_onboarding !== true) {
          router.push('/onboarding')
        } else {
          router.push('/')
        }
      }
      
      return { error: null, success: true }
    } catch (error) {
      console.error("Unexpected error during sign in:", error)
      return { error, success: false }
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error("Error signing up:", error.message)
        return { error, success: false }
      }

      if (data.user && typeof data.user.id === 'string') {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            username,
            avatar_url: '',
            has_completed_onboarding: false,
          })

        if (profileError) {
          console.error("Error creating profile:", profileError.message)
          return { error: profileError, success: false }
        }
        
        await syncUserProfile(data.user)

        router.push('/onboarding')
      }

      setUser(data.user)
      setSession(data.session)
      return { error: null, success: true }
    } catch (error) {
      console.error("Unexpected error during sign up:", error)
      return { error, success: false }
    }
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    router.push('/login')
  }

  const value = {
    user,
    session,
    profile,
    isLoading,
    isProfileLoading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    refreshUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within a SupabaseAuthProvider")
  }
  return context
} 