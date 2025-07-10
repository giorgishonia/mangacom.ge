import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // Check for service role key in header
    const serviceRoleKey = request.headers.get('x-supabase-service-role');
    
    // If service role key is provided and matches the expected value, return true
    if (serviceRoleKey && process.env.SUPABASE_SERVICE_ROLE_KEY && 
        serviceRoleKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("Admin check: Service role key used");
      return NextResponse.json({ isAdmin: true }, { status: 200 });
    }
    
    // Explicitly get the cookie store
    const cookieStore = cookies(); 
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore }); // Pass the store

    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }
    
    // Get user profile to check admin role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }
    
    const isAdmin = profile?.role === 'admin';
    
    return NextResponse.json({ isAdmin }, { status: 200 });
  } catch (error) {
    console.error("Admin check error:", error);
    return NextResponse.json(
      { error: "Failed to check admin status" },
      { status: 500 }
    );
  }
} 