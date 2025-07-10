import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";

// Schema for adding content to watchlist/favorites
const addToLibrarySchema = z.object({
  contentId: z.string().uuid("Invalid content ID"),
  list: z.enum(["watching", "completed", "plan_to_watch", "on_hold", "dropped", "favorites"]),
});

// Schema for updating progress
const updateProgressSchema = z.object({
  contentId: z.string().uuid("Invalid content ID"),
  episodeNumber: z.number().int().positive().optional(),
  chapterNumber: z.number().int().positive().optional(),
  progress: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

// Get user's library items (watchlist, favorites, etc.)
export async function GET(request: NextRequest) {
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
  
  const userId = session.user.id;
  const searchParams = request.nextUrl.searchParams;
  const list = searchParams.get("list");
  const contentId = searchParams.get("contentId");
  
  try {
    let query = supabase
      .from("user_library")
      .select("*, content(*)")
      .eq("userId", userId);
    
    if (list) {
      query = query.eq("list", list);
    }
    
    if (contentId) {
      query = query.eq("contentId", contentId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching user library:", error);
    return NextResponse.json(
      { error: "Failed to fetch user library" },
      { status: 500 }
    );
  }
}

// Add content to user's library (watchlist, favorites, etc.)
export async function POST(request: NextRequest) {
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
  
  const userId = session.user.id;
  
  try {
    const requestData = await request.json();
    const validatedData = addToLibrarySchema.parse(requestData);
    
    // Verify content exists
    const { data: contentData, error: contentError } = await supabase
      .from("content")
      .select("id")
      .eq("id", validatedData.contentId)
      .single();
      
    if (contentError || !contentData) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }
    
    // Check if entry already exists
    const { data: existingEntry, error: checkError } = await supabase
      .from("user_library")
      .select("id")
      .eq("userId", userId)
      .eq("contentId", validatedData.contentId)
      .eq("list", validatedData.list)
      .single();
      
    if (!checkError && existingEntry) {
      return NextResponse.json(
        { message: "Entry already exists", id: existingEntry.id },
        { status: 200 }
      );
    }
    
    // Add to user library
    const { data, error } = await supabase
      .from("user_library")
      .insert({
        userId,
        contentId: validatedData.contentId,
        list: validatedData.list,
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error adding to library:", error);
    return NextResponse.json(
      { error: "Failed to add to library" },
      { status: 500 }
    );
  }
}

// Update user's progress
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
  
  const userId = session.user.id;
  
  try {
    const requestData = await request.json();
    const validatedData = updateProgressSchema.parse(requestData);
    
    // Verify content exists
    const { data: contentData, error: contentError } = await supabase
      .from("content")
      .select("id, type")
      .eq("id", validatedData.contentId)
      .single();
      
    if (contentError || !contentData) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData = {
      updatedAt: new Date().toISOString(),
    };
    
    // Set progress based on content type
    if (contentData.type === "anime" && validatedData.episodeNumber) {
      updateData["currentEpisode"] = validatedData.episodeNumber;
    } else if (contentData.type === "manga" && validatedData.chapterNumber) {
      updateData["currentChapter"] = validatedData.chapterNumber;
    } else if (validatedData.progress !== undefined) {
      // Generic progress (percentage)
      updateData["progress"] = validatedData.progress;
    }
    
    // Set completed status if provided
    if (validatedData.completed !== undefined) {
      updateData["completed"] = validatedData.completed;
      
      // If marked as completed, update list status
      if (validatedData.completed) {
        updateData["list"] = "completed";
      }
    }
    
    // Check if entry exists
    const { data: existingEntry, error: checkError } = await supabase
      .from("user_progress")
      .select("id")
      .eq("userId", userId)
      .eq("contentId", validatedData.contentId)
      .single();
      
    if (checkError) {
      // Create new progress entry
      const { data, error } = await supabase
        .from("user_progress")
        .insert({
          userId,
          contentId: validatedData.contentId,
          ...updateData,
        })
        .select()
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data, { status: 201 });
    } else {
      // Update existing progress entry
      const { data, error } = await supabase
        .from("user_progress")
        .update(updateData)
        .eq("id", existingEntry.id)
        .select()
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

// Remove from library
export async function DELETE(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const searchParams = request.nextUrl.searchParams;
  const contentId = searchParams.get("contentId");
  const list = searchParams.get("list");
  
  if (!contentId || !list) {
    return NextResponse.json(
      { error: "Content ID and list type are required" },
      { status: 400 }
    );
  }
  
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
  
  const userId = session.user.id;
  
  try {
    // Remove from user library
    const { error } = await supabase
      .from("user_library")
      .delete()
      .eq("userId", userId)
      .eq("contentId", contentId)
      .eq("list", list);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from library:", error);
    return NextResponse.json(
      { error: "Failed to remove from library" },
      { status: 500 }
    );
  }
} 