import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the Supabase session
    const { data: { session: supabaseSession } } = await supabase.auth.getSession();
    
    // Check if user has a profile with admin role
    let isAdmin = false;
    let userId = null;
    
    if (supabaseSession) {
      userId = supabaseSession.user.id;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      isAdmin = profile?.role === 'admin';
    }
    
    return NextResponse.json({
      isAuthenticated: !!supabaseSession,
      userId,
      isAdmin,
      supabaseUser: !!supabaseSession
    });
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json(
      { error: "Failed to check authentication status" },
      { status: 500 }
    );
  }
} 