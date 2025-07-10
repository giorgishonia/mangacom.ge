import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";

// Define schema for profile validation
const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username cannot exceed 30 characters").optional(),
  displayName: z.string().max(50, "Display name cannot exceed 50 characters").optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  avatar: z.string().url("Invalid avatar URL").optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  notifications: z.boolean().optional(),
});

// Get user profile
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");
  
  try {
    // Verify user is authenticated for their own profile
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (username) {
      // Get profile by username (public data)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, displayName, bio, avatar, createdAt")
        .eq("username", username)
        .single();
        
      if (error) throw error;
      
      // Get user's content stats (counts of anime/manga in different lists)
      const { data: stats, error: statsError } = await supabase
        .from("user_library")
        .select("list, count(*)")
        .eq("userId", data.id)
        .group("list");
        
      if (statsError) throw statsError;
      
      return NextResponse.json({
        ...data,
        stats: stats || [],
      });
    } else if (session) {
      // Get own profile (private data)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
        
      if (error) throw error;
      
      // Get user's content stats
      const { data: stats, error: statsError } = await supabase
        .from("user_library")
        .select("list, count(*)")
        .eq("userId", session.user.id)
        .group("list");
        
      if (statsError) throw statsError;
      
      return NextResponse.json({
        ...data,
        stats: stats || [],
      });
    } else {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// Update user profile
export async function PUT(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verify user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    const profileData = await request.json();
    
    // Validate profile data
    const validatedData = profileSchema.parse(profileData);
    
    // If username is provided, check if it's already taken
    if (validatedData.username) {
      const { data: existingUser, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", validatedData.username)
        .neq("id", session.user.id)
        .single();
        
      if (!checkError && existingUser) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 }
        );
      }
    }
    
    // Update profile in database
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...validatedData,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", session.user.id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// Get user activity (progress updates, list additions, etc.)
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const requestData = await request.json();
  const userId = requestData.userId;
  
  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required" },
      { status: 400 }
    );
  }
  
  try {
    // Get recent updates to user's progress
    const { data: progressUpdates, error: progressError } = await supabase
      .from("user_progress")
      .select("*, content(*)")
      .eq("userId", userId)
      .order("updatedAt", { ascending: false })
      .limit(10);
      
    if (progressError) throw progressError;
    
    // Get recent additions to user's library
    const { data: libraryAdditions, error: libraryError } = await supabase
      .from("user_library")
      .select("*, content(*)")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(10);
      
    if (libraryError) throw libraryError;
    
    return NextResponse.json({
      progress: progressUpdates || [],
      additions: libraryAdditions || [],
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch user activity" },
      { status: 500 }
    );
  }
} 