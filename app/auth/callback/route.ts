import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Import the user profile fetching function
import { getProfileForUser } from '@/lib/users'; 

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      console.log("OAuth callback successful, session obtained.");
      
      // --- Check if onboarding is needed --- 
      let redirectTo = next; // Default redirect path
      try {
        const userProfile = await getProfileForUser(session.user.id);
        console.log("Profile fetched in callback:", userProfile);
        
        // Check if onboarding is NOT complete (treat null/undefined as not complete)
        if (!userProfile || userProfile.has_completed_onboarding !== true) {
          console.log("User needs onboarding, redirecting to /onboarding");
          redirectTo = '/onboarding'; // Change redirect path
        } else {
          console.log("User already onboarded.");
        }
      } catch (profileError) {
        console.error("Error checking profile during auth callback:", profileError);
        // Proceed with default redirect even if profile check fails?
        // Or maybe redirect to an error page?
      }
      // --- End Onboarding Check --- 

      // Redirect based on onboarding status
      console.log(`Auth callback successful, redirecting to: ${origin}${redirectTo}`); // Log final redirect path
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    // Log error if session exchange failed
    if (error) {
      console.error("!!! Error exchanging code for session:", error.message, JSON.stringify(error)); // More detailed log
    }
  }

  // If we reach here, the code was missing or exchangeCodeForSession failed.
  // Redirect to the homepage instead of a non-existent error page.
  // The user is likely logged in anyway due to session management, 
  // so the homepage will reflect the logged-in state.
  console.error("!!! Auth callback error: No code found or session exchange failed. Redirecting to homepage (/) instead of error page."); 
  return NextResponse.redirect(`${origin}/`); // Redirect to homepage
} 